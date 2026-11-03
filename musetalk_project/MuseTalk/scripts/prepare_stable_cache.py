"""Build a separate cache with stable crop geometry; original cache is intact."""
from pathlib import Path
from types import SimpleNamespace
import json,os,pickle,sys,time
import cv2,numpy as np,torch
from scipy.ndimage import gaussian_filter1d

MUSE=Path(__file__).resolve().parents[1]; ROOT=MUSE.parents[1]
os.chdir(MUSE)
sys.path.insert(0,str(MUSE))
from muse_stream.config import load_config
from muse_stream.models import build_runtime
from musetalk.utils.blending import get_image_prepare_material

args=load_config('configs/streaming_duplex_knowledge.yaml').args
runtime=build_runtime(args);vae=runtime.vae
source=MUSE/'results/v15/avatars/knowledge_host_720p'
name='knowledge_host_720p_stable_v1'
destination=source.parent/name
assert not destination.exists(), 'Stable cache already exists; do not overwrite it'
working=source.parent/(name+'.building')
working.mkdir(exist_ok=True)
for sub in ['full_imgs','mask','vid_output']:(working/sub).mkdir(exist_ok=True)
old=np.array(pickle.load(open(source/'coords.pkl','rb')),dtype=float)
coords=np.rint(gaussian_filter1d(old,1.15,axis=0,mode='wrap')).astype(int).tolist()
latents=[];mcoords=[];started=time.monotonic()
with torch.inference_mode():
    for start in range(0,len(coords),8):
        ids=list(range(start,min(start+8,len(coords))))
        crops=[]
        for i in ids:
            filename=f'{i:08d}.png';source_image=source/'full_imgs'/filename
            image=cv2.imread(str(source_image));x1,y1,x2,y2=coords[i]
            crops.append(cv2.resize(image[y1:y2,x1:x2],(256,256),interpolation=cv2.INTER_LANCZOS4))
            mask,mc=get_image_prepare_material(image,coords[i],fp=runtime.face_parser,mode='jaw')
            cv2.imwrite(str(working/'mask'/filename),mask);mcoords.append(mc)
            target=working/'full_imgs'/filename
            if not target.exists():os.link(source_image,target)
        masked=torch.cat([vae.preprocess_img(im,half_mask=True) for im in crops]).to(vae.vae.dtype)
        full=torch.cat([vae.preprocess_img(im,half_mask=False) for im in crops]).to(vae.vae.dtype)
        lm=vae.scaling_factor*vae.vae.encode(masked).latent_dist.mode()
        lr=vae.scaling_factor*vae.vae.encode(full).latent_dist.mode()
        latents.extend(torch.cat([lm[i:i+1],lr[i:i+1]],dim=1).cpu() for i in range(len(ids)))
        if start%128==0:print(f'prepared {min(start+8,len(coords))}/{len(coords)} frames',flush=True)
for filename,value in [('coords.pkl',coords),('mask_coords.pkl',mcoords)]:
    with open(working/filename,'wb') as f:pickle.dump(value,f)
torch.save(latents,working/'latents.pt')
(working/'avator_info.json').write_text(json.dumps({'avatar_id':name,'video_path':'data/video/knowledge_host_720p.mp4','bbox_shift':0,'version':'v15'}))
report={'source':str(source),'frames':len(coords),'dimensions':[768,1344],'bbox_smoothing_sigma':1.15,'latent_reference':'posterior_mode','prepare_seconds':round(time.monotonic()-started,2),'original_bbox_max_delta':np.abs(np.diff(old,axis=0)).max(axis=0).tolist(),'stable_bbox_max_delta':np.abs(np.diff(np.array(coords),axis=0)).max(axis=0).tolist()}
(working/'stabilization.json').write_text(json.dumps(report,indent=2))
os.rename(working,destination)
print(json.dumps(report),flush=True)
