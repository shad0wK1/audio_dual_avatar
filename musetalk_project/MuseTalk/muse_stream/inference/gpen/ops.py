"""GPEN operators, selecting official CUDA implementations at initialization.

Adapted from yangxy/GPEN face_model/op; native formulas are unchanged.
"""
import torch
from torch import nn
from torch.nn import functional as F

_cuda_fused = None
_cuda_upfirdn = None


def configure(backend):
    global _cuda_fused, _cuda_upfirdn
    if backend == "cuda":
        from .cuda_fused_act import fused_leaky_relu as fused
        from .cuda_upfirdn2d import upfirdn2d as upfirdn
        _cuda_fused, _cuda_upfirdn = fused, upfirdn
    elif backend != "native":
        raise ValueError("MUSETALK_GPEN_OPS must be cuda or native")


class FusedLeakyReLU(nn.Module):
    def __init__(self, channel, negative_slope=0.2, scale=2 ** 0.5, device="cpu"):
        super().__init__()
        self.bias = nn.Parameter(torch.zeros(channel))
        self.negative_slope = negative_slope
        self.scale = scale

    def forward(self, input):
        return fused_leaky_relu(input, self.bias, self.negative_slope, self.scale)


def fused_leaky_relu(input, bias, negative_slope=0.2, scale=2 ** 0.5, device="cpu"):
    if _cuda_fused is not None and input.is_cuda:
        return _cuda_fused(input, bias, negative_slope, scale, device="cuda")
    return scale * F.leaky_relu(
        input + bias.view((1, -1) + (1,) * (len(input.shape) - 2)),
        negative_slope=negative_slope)


def upfirdn2d(input, kernel, up=1, down=1, pad=(0, 0), device="cpu"):
    if _cuda_upfirdn is not None and input.is_cuda:
        return _cuda_upfirdn(input, kernel, up, down, pad, device="cuda")
    return upfirdn2d_native(input, kernel, up, up, down, down,
                           pad[0], pad[1], pad[0], pad[1])


def upfirdn2d_native(
    input, kernel, up_x, up_y, down_x, down_y, pad_x0, pad_x1, pad_y0, pad_y1
):
    input = input.permute(0, 2, 3, 1)
    _, in_h, in_w, minor = input.shape
    kernel_h, kernel_w = kernel.shape
    out = input.view(-1, in_h, 1, in_w, 1, minor)
    out = F.pad(out, [0, 0, 0, up_x - 1, 0, 0, 0, up_y - 1])
    out = out.view(-1, in_h * up_y, in_w * up_x, minor)

    out = F.pad(
        out, [0, 0, max(pad_x0, 0), max(pad_x1, 0), max(pad_y0, 0), max(pad_y1, 0)]
    )
    out = out[
        :,
        max(-pad_y0, 0) : out.shape[1] - max(-pad_y1, 0),
        max(-pad_x0, 0) : out.shape[2] - max(-pad_x1, 0),
        :,
    ]

    out = out.permute(0, 3, 1, 2)
    out = out.reshape(
        [-1, 1, in_h * up_y + pad_y0 + pad_y1, in_w * up_x + pad_x0 + pad_x1]
    )
    w = torch.flip(kernel, [0, 1]).view(1, 1, kernel_h, kernel_w)
    out = F.conv2d(out, w)
    out = out.reshape(
        -1,
        minor,
        in_h * up_y + pad_y0 + pad_y1 - kernel_h + 1,
        in_w * up_x + pad_x0 + pad_x1 - kernel_w + 1,
    )
    # out = out.permute(0, 2, 3, 1)
    return out[:, :, ::down_y, ::down_x]
