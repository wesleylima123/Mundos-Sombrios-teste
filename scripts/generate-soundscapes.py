#!/usr/bin/env python3
from pathlib import Path
import numpy as np
from scipy.signal import butter, sosfiltfilt
import soundfile as sf
import subprocess, json, tempfile, os

SR=32000
DUR=18.0
N=int(SR*DUR)
OUT=Path('assets/grid-architect/audio')
OUT.mkdir(parents=True, exist_ok=True)

def filt(x, low=None, high=None, order=3):
    ny=SR/2
    if low and high: sos=butter(order,[low/ny,high/ny],btype='band',output='sos')
    elif low: sos=butter(order,low/ny,btype='high',output='sos')
    elif high: sos=butter(order,high/ny,btype='low',output='sos')
    else: return x
    return sosfiltfilt(sos,x)

def periodic_noise(rng, slope=1.0):
    # Periodic colored noise via random spectrum; inherently seamless.
    freqs=np.fft.rfftfreq(N,1/SR)
    amp=np.ones_like(freqs)
    amp[1:]=1/np.maximum(freqs[1:],.2)**slope
    phase=rng.uniform(0,2*np.pi,len(freqs))
    spec=amp*np.exp(1j*phase)
    spec[0]=0
    x=np.fft.irfft(spec,n=N)
    x/=max(1e-9,np.max(np.abs(x)))
    return x

def cyc_sine(freq, phase=0):
    # quantize cycles to duration so loop closes exactly
    cycles=max(1,round(freq*DUR)); f=cycles/DUR
    t=np.arange(N)/SR
    return np.sin(2*np.pi*f*t+phase)

def event_train(rng, count, kind='ping', amp=.1):
    x=np.zeros(N)
    for _ in range(count):
        pos=rng.integers(0,N)
        dur_s=rng.uniform(.05,.7 if kind!='rumble' else 2.5)
        L=max(32,int(SR*dur_s))
        tt=np.arange(L)/SR
        if kind=='ping':
            f=rng.uniform(650,2400); env=np.exp(-tt*rng.uniform(7,18)); y=np.sin(2*np.pi*f*tt)*env
        elif kind=='drip':
            f=rng.uniform(700,1500); env=np.exp(-tt*18); y=(np.sin(2*np.pi*f*tt)+.35*np.sin(2*np.pi*f*1.9*tt))*env
        elif kind=='click':
            y=rng.normal(0,1,L)*np.exp(-tt*35)
            y=filt(y,low=500,high=4500)
        elif kind=='rumble':
            y=rng.normal(0,1,L)*np.exp(-tt*1.3); y=filt(y,high=100)
        elif kind=='crackle':
            y=rng.normal(0,1,L)*np.exp(-tt*rng.uniform(18,35)); y=filt(y,low=900,high=6500)
        else:
            y=rng.normal(0,1,L)*np.exp(-tt*8)
        y/=max(1e-9,np.max(np.abs(y))); y*=amp*rng.uniform(.55,1)
        idx=(np.arange(L)+pos)%N
        np.add.at(x,idx,y)
    return x

def stereo_width(base, rng, width=.35):
    side=periodic_noise(rng,1.0)
    side=filt(side,high=2500)
    l=base+width*side*.18
    r=base-width*side*.18
    return np.column_stack([l,r])

def softclip(x): return np.tanh(x*1.15)/np.tanh(1.15)

def mix_profile(seed, spec):
    rng=np.random.default_rng(seed)
    base=np.zeros(N)
    for layer in spec.get('noise',[]):
        x=periodic_noise(rng,layer.get('slope',1.0))
        x=filt(x,layer.get('low'),layer.get('high'))
        base+=x*layer.get('amp',.1)
    for tone in spec.get('tones',[]):
        x=cyc_sine(tone['f'],rng.uniform(0,6.28))
        if tone.get('mod'):
            m=cyc_sine(tone['mod'],rng.uniform(0,6.28)); x*=.72+.28*m
        base+=x*tone.get('amp',.02)
    for ev in spec.get('events',[]):
        base+=event_train(rng,ev['count'],ev['kind'],ev.get('amp',.08))
    # speech-friendly notch and cleanup
    base=filt(base,low=28,high=11000)
    # gentle 1.8-3.6 kHz reduction by subtracting a band component
    mid=filt(base,low=1500,high=3600)
    base=base-mid*.28
    st=stereo_width(base,rng,spec.get('width',.35))
    st=softclip(st)
    peak=np.max(np.abs(st))
    if peak>0: st*=0.72/peak
    return st.astype(np.float32)

profiles={
'exodo_archive':dict(noise=[dict(slope=1.15,high=900,amp=.16),dict(slope=.2,low=2500,high=7600,amp=.025)],tones=[dict(f=48,amp=.028,mod=.13),dict(f=96,amp=.009)],events=[dict(kind='ping',count=7,amp=.025),dict(kind='click',count=10,amp=.015)],width=.28),
'exodo_biolab':dict(noise=[dict(slope=1.05,high=780,amp=.15),dict(slope=.55,low=700,high=5000,amp=.035)],tones=[dict(f=55,amp=.025,mod=.17),dict(f=110,amp=.008)],events=[dict(kind='drip',count=9,amp=.035),dict(kind='ping',count=5,amp=.018)],width=.32),
'exodo_industrial':dict(noise=[dict(slope=1.35,high=420,amp=.22),dict(slope=.7,low=150,high=2400,amp=.04)],tones=[dict(f=36,amp=.05,mod=.09),dict(f=72,amp=.02),dict(f=144,amp=.006)],events=[dict(kind='rumble',count=4,amp=.07),dict(kind='click',count=8,amp=.025)],width=.22),
'exodo_city_rain':dict(noise=[dict(slope=.15,low=600,high=9000,amp=.16),dict(slope=1.1,high=350,amp=.09)],tones=[dict(f=44,amp=.012,mod=.08)],events=[dict(kind='rumble',count=3,amp=.04),dict(kind='click',count=12,amp=.012)],width=.48),
'ocultatun_archive':dict(noise=[dict(slope=1.35,high=620,amp=.12),dict(slope=.9,low=900,high=4000,amp=.012)],tones=[dict(f=41,amp=.025,mod=.07),dict(f=82,amp=.009)],events=[dict(kind='click',count=7,amp=.012),dict(kind='drip',count=3,amp=.018)],width=.25),
'ocultatun_ritual':dict(noise=[dict(slope=1.5,high=360,amp=.16)],tones=[dict(f=41,amp=.04,mod=.11),dict(f=61.5,amp=.026,mod=.07),dict(f=82,amp=.012)],events=[dict(kind='rumble',count=3,amp=.04),dict(kind='ping',count=5,amp=.012)],width=.38),
'ocultatun_anomaly':dict(noise=[dict(slope=.8,low=140,high=1100,amp=.085),dict(slope=.25,low=3000,high=8000,amp=.012)],tones=[dict(f=37,amp=.035,mod=.19),dict(f=73,amp=.021,mod=.23),dict(f=119,amp=.007,mod=.13)],events=[dict(kind='ping',count=9,amp=.018),dict(kind='rumble',count=2,amp=.05)],width=.62),
'ocultatun_subterranean':dict(noise=[dict(slope=1.4,high=450,amp=.17),dict(slope=.7,low=500,high=3000,amp=.02)],tones=[dict(f=29,amp=.035,mod=.08),dict(f=58,amp=.016)],events=[dict(kind='drip',count=14,amp=.055),dict(kind='rumble',count=2,amp=.04)],width=.44),
'forest_night':dict(noise=[dict(slope=1.2,high=1300,amp=.11),dict(slope=.15,low=3200,high=9000,amp=.015)],tones=[],events=[dict(kind='ping',count=18,amp=.016),dict(kind='click',count=8,amp=.01)],width=.65),
'storm':dict(noise=[dict(slope=.15,low=500,high=9500,amp=.24),dict(slope=1.5,high=180,amp=.13)],tones=[dict(f=31,amp=.018,mod=.07)],events=[dict(kind='rumble',count=5,amp=.12)],width=.55),
'fire_ruins':dict(noise=[dict(slope=1.0,low=180,high=2600,amp=.12),dict(slope=.2,low=1200,high=8000,amp=.025)],tones=[],events=[dict(kind='crackle',count=55,amp=.07),dict(kind='rumble',count=2,amp=.025)],width=.5),
'quiet_room':dict(noise=[dict(slope=1.4,high=700,amp=.055),dict(slope=.5,low=1700,high=4000,amp=.006)],tones=[dict(f=100,amp=.006),dict(f=200,amp=.0025)],events=[dict(kind='click',count=2,amp=.006)],width=.18),
'rain_light':dict(noise=[dict(slope=.12,low=900,high=10500,amp=.12),dict(slope=1.25,high=280,amp=.035)],tones=[],events=[dict(kind='click',count=18,amp=.006)],width=.62),
'rain_heavy':dict(noise=[dict(slope=.08,low=520,high=10500,amp=.23),dict(slope=1.3,high=260,amp=.07)],tones=[dict(f=33,amp=.009,mod=.055)],events=[dict(kind='rumble',count=2,amp=.028)],width=.68),
'wind_hollow':dict(noise=[dict(slope=1.25,high=1050,amp=.15),dict(slope=.7,low=700,high=1800,amp=.025)],tones=[dict(f=74,amp=.009,mod=.08)],events=[],width=.58),
'cave_drips':dict(noise=[dict(slope=1.5,high=430,amp=.07)],tones=[dict(f=38,amp=.006)],events=[dict(kind='drip',count=18,amp=.07)],width=.7),
'water_pumps':dict(noise=[dict(slope=1.35,high=380,amp=.11),dict(slope=.65,low=350,high=1600,amp=.018)],tones=[dict(f=46,amp=.045),dict(f=92,amp=.017,mod=.12)],events=[dict(kind='click',count=8,amp=.012),dict(kind='drip',count=6,amp=.025)],width=.3),
'machine_room':dict(noise=[dict(slope=1.28,high=520,amp=.17),dict(slope=.55,low=180,high=1700,amp=.026)],tones=[dict(f=36,amp=.048,mod=.09),dict(f=60,amp=.027),dict(f=120,amp=.009)],events=[dict(kind='click',count=11,amp=.018)],width=.26),
'fluorescent':dict(noise=[dict(slope=.35,low=1700,high=4200,amp=.013)],tones=[dict(f=100,amp=.011),dict(f=200,amp=.0045),dict(f=50,amp=.003)],events=[dict(kind='click',count=4,amp=.004)],width=.16),
'subway':dict(noise=[dict(slope=1.32,high=330,amp=.16),dict(slope=.55,low=280,high=1400,amp=.022)],tones=[dict(f=29,amp=.045,mod=.055),dict(f=58,amp=.016)],events=[dict(kind='rumble',count=3,amp=.045)],width=.42),
'radio_static':dict(noise=[dict(slope=.05,low=900,high=5200,amp=.065),dict(slope=.75,low=180,high=700,amp=.012)],tones=[dict(f=401,amp=.003,mod=.31)],events=[dict(kind='click',count=28,amp=.012),dict(kind='ping',count=7,amp=.009)],width=.48),
'archive_room':dict(noise=[dict(slope=1.5,high=620,amp=.045)],tones=[dict(f=100,amp=.0045)],events=[dict(kind='click',count=4,amp=.005)],width=.22),
}

meta={
'exodo_archive':('Arquivo Nexo','exodo','tecnológico','Ventilação profunda, servidores biotecnológicos e pulsos de dados distantes.'),
'exodo_biolab':('Laboratório Biométrico','exodo','biotecnológico','Ar estéril, maquinário úmido, servos discretos e atividade orgânica controlada.'),
'exodo_industrial':('Complexo Industrial','exodo','industrial','Turbinas, hidráulica e ressonância metálica de infraestrutura pesada.'),
'exodo_city_rain':('Megacidade sob Chuva','exodo','urbano','Chuva sobre metal e vidro, tráfego distante e baixa vibração urbana.'),
'ocultatun_archive':('Arquivo Interdito','ocultatun','investigação','Silêncio de arquivo, madeira, salas profundas e ressonância baixa.'),
'ocultatun_ritual':('Câmara Ritual','ocultatun','ritual','Sub-harmônicos, ar imóvel e ressonâncias de pedra sem melodia definida.'),
'ocultatun_anomaly':('Anomalia Ativa','ocultatun','anomalia','Batimentos espectrais instáveis, pressão grave e artefatos eletrônicos impossíveis.'),
'ocultatun_subterranean':('Subsolo Inundado','ocultatun','subterrâneo','Água, tubulações, goteiras e vibração estrutural distante.'),
'forest_night':('Floresta Noturna','generic','natural','Vento baixo, insetos discretos e atividade orgânica distante.'),
'storm':('Tempestade','generic','clima','Chuva densa, vento e trovões graves distantes, sem picos agressivos.'),
'fire_ruins':('Ruínas em Chamas','generic','fogo','Crepitação de fogo, fluxo de ar e estrutura ressoando ao fundo.'),
'quiet_room':('Sala Silenciosa','generic','interior','Room tone discreto com elétrica distante, ideal para investigação e diálogo.'),
'rain_light':('Chuva Leve','generic','clima','Gotas finas e difusas com baixa pressão grave; adequada a diálogos longos.'),
'rain_heavy':('Chuva Pesada','generic','clima','Cortina de chuva densa, massa de água e rumble distante sem transientes agressivos.'),
'wind_hollow':('Vento Oco','generic','clima','Corrente de ar atravessando corredores, ruínas ou estruturas vazias.'),
'cave_drips':('Caverna e Goteiras','generic','subterrâneo','Room tone pétreo, goteiras esparsas e grande sensação de profundidade.'),
'water_pumps':('Bombas d’Água','generic','industrial','Motores graves, tubulações e água mecânica em ciclos discretos.'),
'machine_room':('Sala de Máquinas','generic','industrial','Múltiplos motores em baixa frequência, servo-mecânica e vibração estrutural.'),
'fluorescent':('Fluorescentes','generic','interior','Hum elétrico frio e mínimo, pensado para hospitais, escritórios e corredores vazios.'),
'subway':('Metrô Subterrâneo','generic','urbano','Túnel grave, vibração ferroviária distante e pressão de infraestrutura subterrânea.'),
'radio_static':('Rádio e Interferência','generic','eletrônico','Estática de banda média, impulsos fragmentados e interferência controlada.'),
'archive_room':('Arquivo Silencioso','generic','investigação','Poeira, sala fechada, madeira e energia elétrica quase imperceptível.'),
}

catalog=[]
for i,(key,spec) in enumerate(profiles.items(),1):
    audio=mix_profile(1000+i,spec)
    wav=OUT/f'{key}.wav'
    ogg=OUT/f'{key}.ogg'
    sf.write(wav,audio,SR,subtype='PCM_16')
    # Opus, voice-friendly wideband but compact; normalize gently.
    subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-i',str(wav),'-c:a','libopus','-b:a','48k','-vbr','on','-application','audio',str(ogg)],check=True)
    wav.unlink()
    name,universe,category,desc=meta[key]
    catalog.append({'id':key,'name':name,'universe':universe,'category':category,'file':f'assets/grid-architect/audio/{key}.ogg','description':desc,'defaultVolume':0.34 if universe!='generic' else 0.3,'loop':True})
Path('data/grid-architect/soundscapes.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2),encoding='utf-8')
print('generated',len(catalog),'soundscapes',sum((OUT/f'{k}.ogg').stat().st_size for k in profiles)/1024/1024,'MB')
