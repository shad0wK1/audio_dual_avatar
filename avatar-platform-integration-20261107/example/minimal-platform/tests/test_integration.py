"""Regressions for platform embedding, origin checks and failure handling."""
import importlib.util
import sys
from pathlib import Path
import httpx
import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

spec = importlib.util.spec_from_file_location('integration_app', Path(__file__).parents[1] / 'app.py')
module = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = module
spec.loader.exec_module(module)


def app(handler=lambda request: httpx.Response(200, json={}), **settings):
    return module.create_app(module.Settings(avatar_api_base_url='http://avatar.test', **settings),
                             transport=httpx.MockTransport(handler))


def test_subpath_config_assets_and_stream_rewrite():
    def upstream(request):
        return httpx.Response(201, json={'session_id': 'avs_test',
            'stream_url': '/v1/avatar/sessions/avs_test/stream?token=short-lived'})
    with TestClient(app(upstream), root_path='/digital-human') as client:
        assert client.get('/api/platform/config').json()['api_prefix'] == '/digital-human/api/avatar'
        assert './static/app.js' in client.get('/').text
        response = client.post('/api/avatar/sessions', json={})
        assert response.json()['stream_url'] == '/digital-human/api/avatar/sessions/avs_test/stream?token=short-lived'
        assert response.headers['cache-control'] == 'no-store'
        assert 'allow="microphone; autoplay; fullscreen"' in client.get('/embed').text


@pytest.mark.parametrize('origin', ['https://evil.test', 'null', 'file://testserver', 'https://testserver@evil.test'])
def test_cross_origin_session_creation_rejected(origin):
    def never(request):
        pytest.fail('rejected browser request must not reach upstream')
    with TestClient(app(never)) as client:
        assert client.post('/api/avatar/sessions', json={}, headers={'Origin': origin}).status_code == 403


def test_cross_origin_websocket_rejected():
    with TestClient(app()) as client:
        with pytest.raises(WebSocketDisconnect) as exc:
            with client.websocket_connect('/api/avatar/sessions/avs_test/stream?token=t',
                                          headers={'origin': 'https://evil.test'}):
                pass
        assert exc.value.code == 1008


def test_allowlisted_and_same_origin_reach_upstream():
    with TestClient(app(lambda r: httpx.Response(429, json={'detail': {'code': 'session_capacity_exhausted'}}),
                        allowed_origins=('https://platform.test',))) as client:
        for origin in ['http://testserver', 'https://platform.test']:
            response = client.post('/api/avatar/sessions', json={}, headers={'Origin': origin})
            assert response.status_code == 429
            assert response.json()['detail']['code'] == 'session_capacity_exhausted'


@pytest.mark.parametrize('body', ['[]', 'null', '{invalid', '42'])
def test_invalid_json_does_not_reach_upstream(body):
    with TestClient(app(lambda r: pytest.fail('invalid JSON reached upstream'))) as client:
        assert client.post('/api/avatar/sessions', content=body).status_code == 400


def test_chunked_body_limit_is_enforced():
    with TestClient(app(lambda r: pytest.fail('oversized body reached upstream'), max_request_body_bytes=16)) as client:
        assert client.post('/api/avatar/sessions', content=iter([b'12345678'] * 3)).status_code == 413


@pytest.mark.parametrize('stream', ['/v1/avatar/sessions/avs_test/stream',
                                    '/v1/avatar/sessions/avs_wrong/stream?token=x',
                                    '/something?token=x'])
def test_invalid_stream_url_is_rejected(stream):
    with TestClient(app(lambda r: httpx.Response(201, json={'session_id': 'avs_test', 'stream_url': stream}))) as client:
        assert client.post('/api/avatar/sessions', json={}).status_code == 502


def test_timeout_is_explicit_and_secrets_are_not_returned():
    def timeout(request):
        raise httpx.ReadTimeout('secret-internal-url', request=request)
    with TestClient(app(timeout, avatar_api_key='secret-api-key')) as client:
        response = client.get('/api/avatar/presets')
        assert response.status_code == 504
        assert response.json()['detail']['code'] == 'upstream_timeout'
        assert 'secret' not in response.text


def test_readyz_detects_upstream_failure():
    with TestClient(app(lambda r: httpx.Response(503))) as client:
        assert client.get('/healthz').status_code == 200
        assert client.get('/readyz').status_code == 502


@pytest.mark.parametrize('worker,active,expected', [
    ('duplex_active', 'avatar_b', 409), ('idle', 'avatar_b', 409), ('idle', 'avatar_a', 200),
])
def test_prepare_requires_idle_duplex_worker_and_matching_loaded_avatar(worker, active, expected):
    calls = []
    def upstream(request):
        path = request.url.path
        calls.append(path)
        if path == '/workers':
            data = {'workers': [{'status': worker, 'capabilities': ['audio_duplex']}]}
        elif path == '/avatar-live/api/status':
            data = {'avatar_id': active, 'avatar_revision': 4, 'ready': True, 'avatar_ready': True,
                    'accepting_streams': True}
        else:
            assert path == '/avatar-live/api/avatar-presets/preset_a/activate'
            data = {'success': True, 'id': 'preset_a', 'avatar_id': 'avatar_a', 'avatar_revision': 4}
        return httpx.Response(200, json=data)
    with TestClient(app(upstream)) as client:
        result = client.post('/api/avatar/presets/preset_a/prepare')
        assert result.status_code == expected
        if worker != 'idle':
            assert not any(p.endswith('/activate') for p in calls)
        if expected == 200:
            assert result.json()['ready'] is True
