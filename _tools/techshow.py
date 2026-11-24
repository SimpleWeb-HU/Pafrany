# Technology: interactive showcase (thermostat, sound insulation, windows)
# -> build/src/partials/tech-showcase.{en,hu}.html
import re
SV={k:open(f'techshow/{k}.svg').read() for k in ('th','wa','wi')}
def svg(k):
    s=SV[k]
    s=re.sub(r'<svg ',f'<svg class="tech-showcase__line" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet" ',s,count=1)
    s=re.sub(r'\s+',' ',s).replace('> <','><')
    return s
ITEMS=[
 ('th','tech-thermostat',(600,1000),{
   'en':('Thermostat','Room-by-room climate','Every residence has its own heating and cooling: an air-to-water heat pump, underfloor heating and ceiling cooling. Temperature and shading are set on the wall panel or from a phone, as part of the integrated smart home.','Brushed bronze smart home thermostat panel'),
   'hu':('Termosztát','Helyiségenkénti klíma','Minden lakás saját fűtéssel és hűtéssel készül: levegő-víz hőszivattyú, padlófűtés és mennyezeti hűtés. A hőmérsékletet és az árnyékolást a fali panelen vagy telefonról lehet állítani, az integrált okosotthon részeként.','Szálcsiszolt bronz okosotthon-termosztát panel')}),
 ('wa','tech-wall',(600,1000),{
   'en':('Sound insulation','Quiet between homes','Party walls are 25 cm precast reinforced concrete with a plasterboard lining. Every room has a floating screed on two layers of impact sound insulation, the stairs rest on vibration-damping pads and entrance doors are rated at least 35 dB.','Section through the party wall and floor build-up'),
   'hu':('Hangszigetelés','Csend a lakások között','A lakáselválasztó falak 25 cm vastag előregyártott vasbetonból készülnek, gipszkarton előtétfallal. Minden helyiségben két réteg lépéshangszigetelésre fektetett úsztatott esztrich van, a lépcsők rezgéscsillapító alátéten állnak, a bejárati ajtók legalább 35 dB hangszigetelésűek.','Metszet a lakáselválasztó falon és a padló rétegrendjén')}),
 ('wi','tech-window',(600,780),{
   'en':('Premium windows','Reynaers HiFinity glazing','Thermally broken aluminium frames with large lift-and-slide doors and triple warm-edge glazing (Ug 0.6 W/m²K), with RC2 security glass on the ground floor. Motorised external blinds with bronze slats provide shading.','Reynaers HiFinity window frame with glass'),
   'hu':('Prémium nyílászárók','Reynaers HiFinity üvegezés','Hőhídmentes alumínium keretek nagyméretű emelő-toló szerkezetekkel és háromrétegű, melegperemű üvegezéssel (Ug 0,6 W/m²K), a földszinten RC2 biztonsági üveggel. Az árnyékolást motoros, bronz lamellás külső zsaluzia adja.','Reynaers HiFinity ablakkeret üvegezéssel')}),
]
GROUP={'en':'Technical details','hu':'Műszaki részletek'}
for lang in ('en','hu'):
    lis=[]
    for i,(k,img,ws,t) in enumerate(ITEMS):
        label,title,text,alt=t[lang]
        sel='true' if i==0 else 'false'
        srcset=', '.join(f'assets/images/{img}-{w}.webp {w}w' for w in ws)
        lis.append(f'''      <li class="tech-showcase__item{' is-active' if i==0 else ''}" data-showcase-item>
        <button class="tech-showcase__trigger" type="button" role="tab" id="ts-tab-{k}" aria-selected="{sel}" aria-controls="ts-panel" tabindex="{0 if i==0 else -1}">
          <span class="tech-showcase__stage">
            {svg(k)}
            <img class="tech-showcase__fill" src="assets/images/{img}-{ws[0]}.webp" srcset="{srcset}" sizes="(min-width: 992px) 30vw, 64vw" alt="{alt}" loading="lazy" decoding="async">
          </span>
          <span class="tech-showcase__label">{label}</span>
        </button>
        <div class="tech-showcase__data" data-showcase-data>
          <h3 class="tech-showcase__data-title">{title}</h3>
          <p class="tech-showcase__data-text">{text}</p>
        </div>
      </li>''')
    t0=ITEMS[0][3][lang]
    html=f'''<div class="tech-showcase" data-project-component="tech-showcase">
  <ul class="tech-showcase__list" role="tablist" aria-label="{GROUP[lang]}" data-showcase-list>
{chr(10).join(lis)}
  </ul>
  <div class="tech-showcase__panel" id="ts-panel" role="tabpanel" aria-labelledby="ts-tab-th" aria-live="polite" data-showcase-panel>
    <h3 class="tech-showcase__title" data-showcase-title>{t0[1]}</h3>
    <p class="tech-showcase__text" data-showcase-text>{t0[2]}</p>
  </div>
</div>
'''
    open(f'build/src/partials/tech-showcase.{lang}.html','w').write(html)
print('ok')
