"""Собирает grid.html из grid.tpl.html, подкладывая style / svg / script из index.html (единый код drawer)."""
import re,os
d=os.path.dirname(os.path.abspath(__file__))
idx=open(os.path.join(d,'index.html'),encoding='utf-8').read()
tpl=open(os.path.join(d,'grid.tpl.html'),encoding='utf-8').read()
def cut(s,a,b):
    i=s.index(a); j=s.index(b,i)+len(b); return s[i:j]
style=cut(idx,'<style>','</style>')
svg=cut(idx,'<svg width="0"','</svg>')
script=cut(idx,'<script>','</script>')
out=tpl.replace('{{STYLE}}',style).replace('{{SVG}}',svg).replace('{{SCRIPT}}',script)
open(os.path.join(d,'grid.html'),'w',encoding='utf-8').write(out)
print('grid.html',len(out))
