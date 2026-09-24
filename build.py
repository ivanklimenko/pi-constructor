"""Собирает grid.html и rub-grid.html из шаблонов, подкладывая style / svg / script из index.html (единый код drawer)."""
import os
d=os.path.dirname(os.path.abspath(__file__))
idx=open(os.path.join(d,'index.html'),encoding='utf-8').read()
def cut(s,a,b):
    i=s.index(a); j=s.index(b,i)+len(b); return s[i:j]
style=cut(idx,'<style>','</style>')
svg=cut(idx,'<svg width="0"','</svg>')
script=idx[idx.index('<script>'):idx.rindex('</script>')+len('</script>')]
for name in ('grid','rub-grid'):
    tpl=open(os.path.join(d,name+'.tpl.html'),encoding='utf-8').read()
    out=tpl.replace('{{STYLE}}',style).replace('{{SVG}}',svg).replace('{{SCRIPT}}',script)
    open(os.path.join(d,name+'.html'),'w',encoding='utf-8').write(out)
    print(name+'.html',len(out))
