"""Voz, trilha e efeitos do vídeo pelo ElevenLabs.

A chave vem da variável de ambiente ELEVENLABS_API_KEY; nunca é gravada em arquivo.
  python tools/elevenlabs.py conta                  -> plano e caracteres disponíveis
  python tools/elevenlabs.py vozes                  -> vozes da conta e vozes pt-BR da biblioteca
  python tools/elevenlabs.py voz <voice_id>         -> narração de roteiro/narracao.txt com o tempo de cada letra
  python tools/elevenlabs.py trilha                 -> trilha instrumental (Eleven Music)
  python tools/elevenlabs.py efeito <nome> "<descrição>" <segundos> [pasta]
  python tools/elevenlabs.py conferir [pasta]       -> transcreve a narração (Scribe) para conferir o que a voz falou
"""
from pathlib import Path
import base64, json, os, sys, urllib.request, urllib.error, urllib.parse

ROOT = Path(__file__).resolve().parents[1]
AUDIO = ROOT / 'assets' / 'audio'
AUDIO.mkdir(parents=True, exist_ok=True)
API = 'https://api.elevenlabs.io'


def key() -> str:
    k = os.environ.get('ELEVENLABS_API_KEY')
    if not k:
        raise SystemExit('Defina ELEVENLABS_API_KEY')
    return k


def call(method: str, path: str, body=None, raw=False, timeout=300):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(API + path, data=data, method=method, headers={
        'xi-api-key': key(), 'Content-Type': 'application/json', 'Accept': '*/*'})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            payload = r.read()
    except urllib.error.HTTPError as e:
        raise SystemExit(f'{method} {path}: HTTP {e.code} {e.read()[:600]!r}')
    return payload if raw else json.loads(payload)


def conta():
    sub = call('GET', '/v1/user/subscription')
    print(json.dumps({k: sub.get(k) for k in ('tier', 'character_count', 'character_limit', 'status')}, ensure_ascii=False))


def vozes():
    mine = call('GET', '/v1/voices')
    print('Da conta:')
    for v in mine.get('voices', []):
        labels = v.get('labels') or {}
        print(' ', v['voice_id'], v['name'], labels.get('language') or '', labels.get('accent') or '', labels.get('gender') or '', v.get('category'))
    q = urllib.parse.urlencode({'language': 'pt', 'page_size': 40, 'sort': 'trending'})
    shared = call('GET', f'/v1/shared-voices?{q}')
    print('Biblioteca (pt):')
    for v in shared.get('voices', []):
        print(' ', v.get('voice_id'), v.get('public_owner_id'), '|', v.get('name'), '|', v.get('accent'), v.get('gender'), v.get('age'), v.get('use_case'), '|', (v.get('description') or '')[:90])


def voz(voice_id: str, model: str = 'eleven_multilingual_v2', roteiro: str = 'narracao.txt', destino: str = '',
        stability: float = 0.42, similarity: float = 0.8, style: float = 0.35, speed: float = 1.1):
    """Narração com o tempo de cada letra. `destino` é a subpasta de assets/audio (ex.: v2)."""
    out = AUDIO / destino if destino else AUDIO
    out.mkdir(parents=True, exist_ok=True)
    text = (ROOT / 'roteiro' / roteiro).read_text(encoding='utf-8').strip()
    body = {
        'text': text,
        'model_id': model,
        'language_code': 'pt',
        'voice_settings': {'stability': stability, 'similarity_boost': similarity, 'style': style, 'use_speaker_boost': True, 'speed': speed},
    }
    res = call('POST', f'/v1/text-to-speech/{voice_id}/with-timestamps?output_format=mp3_44100_128', body)
    (out / 'narracao.mp3').write_bytes(base64.b64decode(res['audio_base64']))
    al = res.get('normalized_alignment') or res.get('alignment')
    (out / 'narracao-alinhamento.json').write_text(json.dumps({'text': text, 'alignment': al, 'voice': voice_id, 'settings': body['voice_settings']}, ensure_ascii=False), encoding='utf-8')
    end = al['character_end_times_seconds'][-1] if al else 0
    print('narração:', round(end, 2), 's')


def voz3(voice_id: str, roteiro: str = 'narracao.txt', destino: str = '', estabilidade: float = 0.0, texto: str = ''):
    """Narração no Eleven v3 (o mais expressivo; aceita marcações como [animado]) com o tempo de cada letra.
    No v3 a estabilidade só aceita 0 (criativa), 0,5 (natural) ou 1 (robusta)."""
    out = AUDIO / destino if destino else AUDIO
    out.mkdir(parents=True, exist_ok=True)
    text = texto or (ROOT / 'roteiro' / roteiro).read_text(encoding='utf-8').strip()
    body = {'text': text, 'model_id': 'eleven_v3', 'language_code': 'pt', 'voice_settings': {'stability': estabilidade}}
    res = call('POST', f'/v1/text-to-speech/{voice_id}/with-timestamps?output_format=mp3_44100_128', body, timeout=600)
    (out / 'narracao.mp3').write_bytes(base64.b64decode(res['audio_base64']))
    al = res.get('normalized_alignment') or res.get('alignment')
    (out / 'narracao-alinhamento.json').write_text(json.dumps({'text': text, 'alignment': al, 'voice': voice_id, 'model': 'eleven_v3', 'settings': body['voice_settings']}, ensure_ascii=False), encoding='utf-8')
    end = al['character_end_times_seconds'][-1] if al else 0
    print('narracao v3:', round(end, 2), 's')


PROMPTS_TRILHA = {
    'suturas': (
        'Confident, precise modern electronic instrumental for a fast surgical skills tutorial on TikTok for medical students. '
        '120 BPM, crisp drums, tight plucked synth stabs that feel like quick hands at work, deep sub bass, focused and clean operating-room energy, '
        'steady groove the whole time with a small lift every 8 bars, no long breaks, a clean final hit at 64 seconds and a short tail. No vocals, no lyrics.'
    ),
    'pocus': (
        'Driving, modern electronic instrumental for a fast medical ultrasound tutorial on TikTok for medical students. '
        '124 BPM, tight punchy drums, pulsing synth bass, a clean arpeggiated synth that feels like a scanning sonar ping, '
        'focused and confident emergency-room energy, steady groove the whole time with a small lift every 8 bars, no long breaks, '
        'a clean final hit at 66 seconds and a short tail. No vocals, no lyrics.'
    ),
    'mitos': (
        'Playful, punchy modern electronic instrumental for a fast myth-busting TikTok for medical students. '
        '122 BPM, bouncy kick and claps, round bass, a cheeky plucked synth hook with small stabs, confident and fun mood, '
        'steady groove the whole time with a small lift every 8 bars, no long breaks, a clean final hit at 64 seconds and a short tail. No vocals, no lyrics.'
    ),
    'normal': (
        'Clean, confident modern electronic instrumental for a fast medical-education TikTok comparing normal and abnormal exams side by side. '
        '120 BPM, punchy kick, crisp claps, warm sub bass, a bright two-note synth motif that answers itself like a before and after, smart mood, '
        'steady groove the whole time with a small lift every 8 bars, no long breaks, a clean final hit at 50 seconds and a short tail. No vocals, no lyrics.'
    ),
    'olhos': (
        'Sleek, confident modern electronic instrumental for a fast medical-education TikTok about what the eyes reveal. '
        '120 BPM, tight kick and claps, deep warm bass, a glassy bright synth hook with a hint of mystery, curious mood, '
        'steady groove the whole time with a small lift every 8 bars, no long breaks, a clean final hit at 52 seconds and a short tail. No vocals, no lyrics.'
    ),
    'lingua': (
        'Playful, confident modern electronic instrumental for a fast medical-education TikTok about what the tongue reveals. '
        '118 BPM, bouncy kick and claps, round bass, a bright marimba-like pluck hook, curious and fun mood, '
        'steady groove the whole time with a small lift every 8 bars, no long breaks, a clean final hit at 60 seconds and a short tail. No vocals, no lyrics.'
    ),
    'pele': (
        'Confident, catchy modern electronic instrumental for a fast medical-education TikTok about classic skin lesions. '
        '120 BPM, punchy kick and claps, warm bass, a bright plucked synth hook with a little sparkle, smart and curious mood, '
        'steady groove the whole time with a small lift every 8 bars, no long breaks, a clean final hit at 60 seconds and a short tail. No vocals, no lyrics.'
    ),
    'raiox': (
        'Focused, modern, confident electronic instrumental for a fast medical-education TikTok that teaches how to read a chest X-ray step by step. '
        '122 BPM, punchy kick, crisp hats, warm sub bass, a clean plucked synth motif with a subtle scanning/sonar texture, curious and smart mood, '
        'steady groove the whole time with a small lift every 8 bars, no long breaks, a clean final hit at 67 seconds and a short tail. No vocals, no lyrics.'
    ),
    'supra': (
        'Tense, urgent and driving modern electronic instrumental for a fast medical-education TikTok about reading a heart attack on an ECG. '
        '124 BPM, a subtle heartbeat-like low kick pulse, tight percussion, dark pulsing synth bass, a bright arpeggiated synth that keeps the energy up, '
        'suspenseful but not scary, steady groove the whole time with small risers every 8 bars, no long breaks, a clean final hit at 74 seconds and a short tail. '
        'No vocals, no lyrics.'
    ),
    'sinais': (
        'Playful, suspenseful game-show style modern electronic instrumental for a fast medical quiz TikTok with three rounds and countdowns. '
        '116 BPM, bouncy plucked synth hook, punchy kick and claps, a light ticking clock texture, curious and fun mood, steady groove the whole '
        'time with small fills every 8 bars, no long breaks, a clean final hit at 57 seconds and a short tail. No vocals, no lyrics.'
    ),
    'monitor': (
        'Focused, modern and energetic electronic instrumental for a fast medical-education TikTok that explains a hospital patient monitor. '
        '120 BPM, tight punchy kick, clean sub bass, crisp hi-hats, a bright plucked synth motif with a subtle electronic heartbeat-like pulse, '
        'confident and curious mood, steady groove the whole time with small fills every 8 bars, no long breaks, a clean final hit at 72 seconds '
        'and a short tail. No vocals, no lyrics.'
    ),
    'gaso': (
        'Suspenseful but energetic modern electronic instrumental for a fast medical-mystery TikTok where a blood gas test is solved step by step '
        'until the hidden diagnosis is revealed. 118 BPM, pulsing sub bass, crisp tight percussion, ticking clock-like hi-hats, a curious '
        'plucked synth motif in a minor key, tension slowly building the whole time, a short riser from 64 to 66.5 seconds and a big satisfying '
        'bright drop at 66.7 seconds for the reveal, then an uplifting groove and a clean final hit at 78 seconds with a short tail. No vocals, no lyrics.'
    ),
    'evolucao': (
        'Playful, clever and upbeat modern lo-fi hip-hop meets electronic instrumental for a fast, fun medical-school TikTok that decodes '
        'the abbreviations of a handwritten hospital chart. 112 BPM, warm punchy kick, crisp snaps, soft vinyl texture, bouncy plucked synth '
        'hook and a subtle typewriter-like percussive tick, curious and confident mood, steady groove the whole time with small fills every '
        '8 bars, no long breaks, a clean final hit at 66 seconds and a short tail. No vocals, no lyrics.'
    ),
    'sifilis': (
        'Mysterious, investigative and energetic modern electronic instrumental for a fast medical-education TikTok about the stages '
        'of syphilis, the great imitator. 112 BPM, deep warm pulsing sub bass, crisp tight percussion, a catchy plucked synth motif in a '
        'minor key with a slightly dark, detective feel, steady driving groove the whole time with small fills every 8 bars, '
        'no long breaks, a clean final hit at 91 seconds and a short tail. No vocals, no lyrics.'
    ),
    'tc': (
        'Tense but energetic modern electronic instrumental for a fast emergency-medicine explainer TikTok about reading a head CT scan. '
        '122 BPM, pulsing sub bass, crisp tight percussion, subtle ticking hi-hats like a clock, bright plucked synth motif, '
        'focused and confident mood, steady driving groove the whole time, a clean final hit at 62 seconds and a short tail. No vocals, no lyrics.'
    ),
    'leco': (
        'Cinematic, curious and energetic modern electronic instrumental for a fast science explainer TikTok about shock waves '
        'breaking a kidney stone. 120 BPM, deep punchy sub bass pulses like impacts, crisp glitchy percussion, bright plucked synth '
        'arpeggio, sense of discovery and power, steady driving groove the whole time, a clean final hit at 54 seconds and a short tail. '
        'No vocals, no lyrics.'
    ),
    'efeitos': (
        'Playful, curious and upbeat modern electronic instrumental for a fast educational TikTok about how a blood pressure '
        'cuff works. 118 BPM, bouncy plucked synths, warm sub bass, crisp snappy percussion with a subtle heartbeat-like kick '
        'pattern, bright and friendly, steady groove the whole time with light fills every 8 bars, a clean final hit at 49 seconds '
        'and a short tail. No vocals, no lyrics.'
    ),
    'eletro': (
        'Upbeat modern electronic hip-hop instrumental for a fast, fun educational TikTok about reading an ECG. '
        'Starts instantly with a punchy kick and a catchy bright plucked synth hook, 124 BPM, deep bass, crisp claps and '
        'hi-hats, playful and confident, steady energetic groove the whole time with small fills every 8 bars, '
        'no long breaks, a clean final hit at 44 seconds and a short tail. No vocals, no lyrics.'
    ),
    '': (
        'Modern, confident and uplifting instrumental for a fast-paced vertical social media ad about a study app. '
        'Punchy electronic pop beat at 118 BPM, deep sub bass, crisp claps, bright plucked synth hook, subtle risers into '
        'the drops at 3 and 7.8 seconds, builds at 12.6 seconds, a short break near 31 seconds and a satisfying final hit. No vocals, no lyrics.'
    ),
    'v2': (
        'Cinematic modern electronic instrumental for a vertical social media ad about a free study app for medical residency exams. '
        'Starts dark and tense with a low pulsing synth and ticking percussion for the first 6 seconds, then builds tension until 18 seconds. '
        'At 18 seconds a big confident uplifting drop with a punchy beat at 120 BPM, deep bass, crisp claps and a bright plucked synth hook, '
        'energetic and driving until 40.5 seconds. From 40.7 to 43.4 seconds a sudden dark quiet break with only a soft pad, '
        'then a riser and a final triumphant hit at 45 seconds that resolves and ends cleanly at 49 seconds. No vocals, no lyrics.'
    ),
    'v4': (
        'Viral TikTok ad instrumental, modern and premium. Starts instantly with a hard sub bass hit and a tense, minimal '
        'ticking pulse with filtered synth for the first 14 seconds, slowly building curiosity with a rising arpeggio. '
        'At 14 seconds a big confident drop: punchy modern electronic trap-pop beat at 125 BPM, deep 808 bass, crisp hi-hat rolls, '
        'snappy claps and a bright catchy synth pluck hook, energetic and driving until 30 seconds, with a big accent hit at 30.4 seconds. '
        'From 31.3 to 33.4 seconds a sudden near-silent dark break with only a low drone, then at 33.5 seconds the full beat returns, '
        'uplifting and triumphant, ending with a clean final hit at 37 seconds and a short tail. No vocals, no lyrics.'
    ),
}


def trilha(segundos: float = 37, destino: str = ''):
    prompt = PROMPTS_TRILHA.get(destino, PROMPTS_TRILHA[''])
    body = {'prompt': prompt, 'music_length_ms': int(segundos * 1000), 'force_instrumental': True}
    audio = call('POST', '/v1/music?output_format=mp3_44100_128', body, raw=True, timeout=600)
    out = AUDIO / destino if destino else AUDIO
    out.mkdir(parents=True, exist_ok=True)
    (out / 'trilha.mp3').write_bytes(audio)
    print('trilha ok', len(audio) // 1024, 'KB')


def efeito(nome: str, descricao: str, segundos: float, destino: str = ''):
    body = {'text': descricao, 'duration_seconds': float(segundos), 'prompt_influence': 0.6}
    audio = call('POST', '/v1/sound-generation?output_format=mp3_44100_128', body, raw=True)
    out = AUDIO / destino if destino else AUDIO
    out.mkdir(parents=True, exist_ok=True)
    (out / f'sfx-{nome}.mp3').write_bytes(audio)
    print('efeito', nome, len(audio) // 1024, 'KB')


def conferir(destino: str = ''):
    """Transcreve a narração (Scribe) para conferir se a voz falou o roteiro inteiro, sem trocar palavras."""
    mp3 = (AUDIO / destino if destino else AUDIO) / 'narracao.mp3'
    boundary = 'medfye' + os.urandom(8).hex()
    parts = []
    for name, value in (('model_id', 'scribe_v1'), ('language_code', 'por')):
        parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n{value}\r\n'.encode())
    parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="narracao.mp3"\r\nContent-Type: audio/mpeg\r\n\r\n'.encode()
                 + mp3.read_bytes() + b'\r\n')
    parts.append(f'--{boundary}--\r\n'.encode())
    req = urllib.request.Request(API + '/v1/speech-to-text', data=b''.join(parts), method='POST', headers={
        'xi-api-key': key(), 'Content-Type': f'multipart/form-data; boundary={boundary}'})
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            res = json.loads(r.read())
    except urllib.error.HTTPError as e:
        raise SystemExit(f'speech-to-text: HTTP {e.code} {e.read()[:600]!r}')
    print(res.get('text', ''))


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'conta'
    if cmd == 'conta': conta()
    elif cmd == 'vozes': vozes()
    elif cmd == 'voz':
        # voz <voice_id> [roteiro] [destino] [estabilidade] [similaridade] [estilo] [velocidade]
        a = sys.argv[2:]
        voz(a[0], 'eleven_multilingual_v2', *(a[1:3]), *(float(x) for x in a[3:7]))
    elif cmd == 'voz3':
        # voz3 <voice_id> [roteiro] [destino] [estabilidade]
        a = sys.argv[2:]
        voz3(a[0], *(a[1:3]), *(float(x) for x in a[3:4]))
    elif cmd == 'trilha': trilha(float(sys.argv[2]) if len(sys.argv) > 2 else 37, sys.argv[3] if len(sys.argv) > 3 else '')
    elif cmd == 'efeito': efeito(sys.argv[2], sys.argv[3], float(sys.argv[4]), sys.argv[5] if len(sys.argv) > 5 else '')
    elif cmd == 'conferir': conferir(sys.argv[2] if len(sys.argv) > 2 else '')
    else: raise SystemExit(__doc__)
