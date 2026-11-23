# GPEN inference architecture

`architecture.py` is copied from `yangxy/GPEN`, `face_model/gpen_model.py`,
retrieved 2026-11-18. The original paper/author header is retained.
Only the `op` import is changed to a relative import.

`ops.py` retains the original native PyTorch upfirdn2d and leaky-ReLU formulas.
The default CUDA path delegates to the original `cuda_fused_act.py`,
`cuda_upfirdn2d.py` and corresponding C++/CUDA files. Only extension names
are prefixed with `avatar_gpen_` to avoid collisions with other libraries.
Compilation occurs at service initialization, not on the first streamed frame.
This module is used for inference only.

Upstream: https://github.com/yangxy/GPEN
Paper: GAN Prior Embedded Network for Blind Face Restoration in the Wild,
CVPR 2021. Author header: yangxy (yangtao9009@gmail.com).

The source archive supplied no standalone license file; this notice records
provenance and does not assert a new license or ownership of upstream code.
No detector, parser, super-resolution weights or training scripts are vendored.
