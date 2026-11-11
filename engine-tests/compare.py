import json, sys, swisseph as swe
from datetime import datetime
data = json.load(open(sys.argv[1]))
ids = dict(Sun=swe.SUN, Moon=swe.MOON, Mercury=swe.MERCURY, Venus=swe.VENUS, Mars=swe.MARS, Jupiter=swe.JUPITER, Saturn=swe.SATURN, Uranus=swe.URANUS, Neptune=swe.NEPTUNE, Pluto=swe.PLUTO)
def d(a,b): x=(a-b)%360; return min(x,360-x)
worst = {}
def upd(k,v,ctx):
    if v > worst.get(k,(0,))[0]: worst[k]=(v,ctx)
for c in data:
    t = datetime.fromisoformat(c['iso'].replace('Z','+00:00'))
    jd = swe.julday(t.year,t.month,t.day,t.hour+t.minute/60+t.second/3600)
    for p,i in ids.items():
        r,_ = swe.calc_ut(jd,i,swe.FLG_MOSEPH|swe.FLG_SPEED)
        eq,_ = swe.calc_ut(jd,i,swe.FLG_MOSEPH|swe.FLG_EQUATORIAL)
        upd(p+' lon', d(r[0],c['pl'][p]['lon'])*3600, c['iso'])
        upd(p+' dec', abs(eq[1]-c['pl'][p]['dec'])*3600, c['iso'])
        upd(p+' speed', abs(r[3]-c['pl'][p]['speed']), c['iso'])
    upd('meanNode', d(swe.calc_ut(jd,swe.MEAN_NODE,swe.FLG_MOSEPH)[0][0],c['meanNode'])*3600, c['iso'])
    upd('trueNode', d(swe.calc_ut(jd,swe.TRUE_NODE,swe.FLG_MOSEPH)[0][0],c['trueNode'])*3600, c['iso'])
    upd('lilith', d(swe.calc_ut(jd,swe.MEAN_APOG,swe.FLG_MOSEPH)[0][0],c['lilith'])*3600, c['iso'])
    try:
        cusps, ascmc = swe.houses(jd, c['lat'], c['lon'], b'P')
    except Exception as e:
        continue
    h = c['houses']
    if h['system'] != 'Placidus': print('porphyry fallback at', c['lat']); continue
    upd('ASC', d(ascmc[0],h['asc'])*3600, (c['iso'],c['lat']))
    upd('MC', d(ascmc[1],h['mc'])*3600, c['iso'])
    for k in range(12): upd('cusps', d(cusps[k],h['cusps'][k])*3600, (c['iso'],c['lat'],k+1))
for k,(v,ctx) in worst.items(): print(f"{k:14s} worst {v:9.2f} {'deg/day' if 'speed' in k else 'arcsec'}  {ctx}")
