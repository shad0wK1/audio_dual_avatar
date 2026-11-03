import numpy as np
from muse_stream.inference.stability import FaceStabilizer,overlap_length

def test_final_tail_uses_preceding_lookahead():
    assert overlap_length({24:None,25:None,26:None,27:None},24,4)==4
    assert overlap_length({24:None,26:None},24,4)==1
    assert overlap_length({20:None,21:None},24,4)==0

def test_filter_is_causal_preserves_upper_face_and_does_not_mutate_input():
    rng=np.random.default_rng(9)
    previous=rng.integers(20,230,(256,256,3),dtype=np.uint8)
    current=previous.copy();current[155:210,75:180]+=5
    original=current.copy()
    s=FaceStabilizer(.22)
    assert s.process(0,previous) is previous
    result=s.process(1,current)
    assert np.array_equal(result[:128],current[:128])
    assert np.array_equal(current,original)
    assert not np.array_equal(result[155:210,75:180],current[155:210,75:180])
    s.reset()
    assert s.process(2,current) is current
    assert s.process(10,previous) is previous

def test_unchanged_face_and_disabled_filter_stay_exact():
    image=np.full((256,256,3),130,np.uint8)
    s=FaceStabilizer(.22);s.process(0,image)
    assert np.array_equal(s.process(1,image),image)
    assert FaceStabilizer(0).process(0,image) is image
