# ATS Currículo — Otimizador (web)

Versão web do projeto *resume-ats-linkedin-optimizer*, feita para rodar em
**https://osachadinhosdashopee.com.br/ats** (nginx + Cloudflare).

| Aba | Função |
|---|---|
| Currículo | Editor com checagem rápida e prévia do texto que o ATS lê. Exporta **PDF** (A4) e **DOCX** de coluna única, com títulos em português ou inglês. Import/export em JSON. |
| Análise da vaga | Cola a vaga e vê a **estimativa** de cobertura de palavras-chave (obrigatórias x desejáveis), clichês/verbos inflados e checagem de veracidade contra o seu perfil original. |
| Auditar arquivo | Envia um PDF/DOCX e detecta tabelas, colunas, caixas de texto, cabeçalho/rodapé, imagens, PDF escaneado, títulos fora do padrão, e-mail/telefone/datas. |
| LinkedIn | Contadores com os limites reais (título 220, sobre 2600) e checklist. |
| Guia | Os guias do projeto original (ATS, bullets, palavras-chave, LinkedIn, mitos, carta). Estão em inglês. |

Princípio: **zero invenção**. A ferramenta nunca cria dados; só organiza, formata e avisa.
Nada fica guardado no servidor: o currículo fica no `localStorage` do navegador e os
arquivos enviados são lidos em memória e descartados.

## Instalar (Debian/Ubuntu)

```bash
unzip ats-web.zip && cd ats-web
sudo ./install.sh
```

O script copia tudo para `/opt/ats-web`, cria um venv, instala as dependências, sobe o serviço
`ats-web` (gunicorn em `127.0.0.1:8095`) e grava o snippet em `/etc/nginx/snippets/ats.conf`.

Depois, dentro do `server { }` do seu domínio:

```nginx
include snippets/ats.conf;
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

Se o domínio ainda não tem `server`, use `deploy/nginx-standalone.conf` como base.
O `/ats` (sem barra) redireciona para `/ats/`; isso é necessário porque o frontend usa caminhos relativos.

## Cloudflare

**Opção A: servidor com IP público**
1. DNS: registro `A` de `osachadinhosdashopee.com.br` apontando para o IP do servidor, com a nuvem **laranja** (Proxied).
2. SSL/TLS: modo **Full** (ou Full strict, com certificado de origem ou Let's Encrypt no nginx).
   O modo Flexible funciona sem HTTPS na origem, mas é menos seguro.
3. Para HTTPS na origem: `sudo certbot --nginx -d osachadinhosdashopee.com.br`.

**Opção B: Cloudflare Tunnel (sem abrir portas; bom para rodar do seu próprio computador)**
```bash
cloudflared tunnel login
cloudflared tunnel create ats
cloudflared tunnel route dns ats osachadinhosdashopee.com.br
```
`~/.cloudflared/config.yml`:
```yaml
tunnel: ats
credentials-file: /home/SEU_USUARIO/.cloudflared/<ID>.json
ingress:
  - hostname: osachadinhosdashopee.com.br
    service: http://localhost:80      # nginx local; o /ats é resolvido pelo snippet
  - service: http_status:404
```
```bash
cloudflared tunnel run ats
```
Se o domínio já serve outro site, o `/ats` entra só pelo `include`; o resto não muda.

## Testar sem nginx

```bash
pip install -r requirements.txt
cd app && python3 server.py        # http://127.0.0.1:8095/
```

## Operação

```bash
systemctl status ats-web
journalctl -u ats-web -f
curl http://127.0.0.1:8095/healthz
```

Para atualizar: copie os arquivos novos para `/opt/ats-web/app` e rode `sudo systemctl restart ats-web`.

## Segurança

- O serviço só escuta em `127.0.0.1`; upload limitado a 6 MB; sem banco, sem login, sem dados persistidos.
- Não há login: quem tiver o link usa a ferramenta. Para restringir, use **Cloudflare Access** em `/ats*`
  ou `auth_basic` no `location /ats/` do nginx.
- Contra abuso, crie uma regra de *Rate Limiting* na Cloudflare para `/ats/api/*`.

## Estrutura

```
app/server.py        API Flask (render, analyze, audit, guides)
app/audit.py         auditoria de PDF/DOCX
app/resume_tools.py  núcleo do projeto original (adaptado para português e A4)
app/static/          frontend (HTML/CSS/JS, sem build)
app/data/            guias e schema do projeto original
deploy/              snippet nginx, serviço systemd
install.sh           instalador
```

Licença MIT (ver `LICENSE`), baseada em *resume-ats-linkedin-optimizer*.
