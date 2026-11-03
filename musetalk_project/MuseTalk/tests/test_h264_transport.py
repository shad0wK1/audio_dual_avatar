import av
import numpy as np
from muse_stream.inference.h264 import H264Encoder

def test_continuation_segments_share_video_references_and_flush_starts_an_idr():
    encoder=H264Encoder(96,128,24)
    decoder=av.CodecContext.create('h264','r')
    frame=np.full((128,96,3),120,np.uint8)
    for index,segment in [(0,1),(1,1),(2,2),(3,2)]:
        payload=encoder.encode(frame,index=index,segment=segment,flush=0)
        assert payload[:4]==b'H264'
        assert bool(payload[4])==(index==0)
        assert len(decoder.decode(av.Packet(payload[5:])))==1
    payload=encoder.encode(frame,index=1,segment=9,flush=1)
    assert payload[4]==1
    assert len(av.CodecContext.create('h264','r').decode(av.Packet(payload[5:])))==1
