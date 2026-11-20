<p align="center"><img src="assets/banner.svg" alt="ATS Currículo — editor, auditoria e análise de vaga para currículos ATS" width="100%"></p>

# ATS Currículo — otimizador web de currículos para sistemas ATS

Aplicação web em **Python (Flask)** para montar e revisar **currículos compatíveis com ATS** (*Applicant Tracking Systems*). Ela exporta o currículo em **PDF e DOCX de coluna única**, compara o currículo com a descrição de uma vaga, audita arquivos já prontos em busca de problemas de leitura e traz guias de LinkedIn e carta de apresentação. O princípio é **não inventar nada**: a ferramenta só organiza, formata e avisa.

## Recursos

| Aba | Função |
|---|---|
| **Currículo** | Editor com checagem rápida e prévia do texto que o ATS lê; exporta PDF (A4) e DOCX com títulos em português ou inglês; importa e exporta JSON |
| **Análise da vaga** | Estimativa de cobertura de palavras-chave (obrigatórias e desejáveis), alerta de clichês e verbos inflados, checagem de veracidade contra o perfil original |
| **Auditar arquivo** | Envia um PDF/DOCX e detecta tabelas, colunas, caixas de texto, cabeçalho/rodapé, imagens, PDF escaneado, títulos fora do padrão e dados de contato |
| **LinkedIn** | Contadores com os limites reais (título 220, sobre 2.600) e checklist |
| **Guia** | Guias de ATS, bullets, palavras-chave, LinkedIn, mitos e carta de apresentação (em inglês) |

**Privacidade**: nada fica no servidor. O currículo fica no `localStorage` do navegador e os arquivos enviados são lidos em memória e descartados.

## Instalação

Requisitos: **Python 3.10+**. Para produção, Debian/Ubuntu com Nginx.

```bash
git clone https://github.com/ticarollamas-arch/ats-web.git
cd ats-web
pip install -r requirements.txt
```

### Servidor (Debian/Ubuntu)

```bash
sudo ./install.sh
```

O script instala em `/opt/ats-web`, cria um ambiente virtual, sobe o serviço `ats-web` (Gunicorn em `127.0.0.1:8095`) e grava o snippet do Nginx em `/etc/nginx/snippets/ats.conf`. Depois, inclua `include snippets/ats.conf;` no bloco `server` do domínio e recarregue o Nginx. Sem um `server` existente, use `deploy/nginx-standalone.conf`.

## Como usar

```bash
cd app && python3 server.py      # http://127.0.0.1:8095/
```

| Rota | Função |
|---|---|
| `POST /api/analyze` | Análise do currículo contra a vaga |
| `POST /api/render` | Gera o PDF ou o DOCX |
| `POST /api/audit` | Audita um arquivo enviado |
| `GET /api/guides`, `/api/schema`, `/api/example` | Guias, schema JSON e currículo de exemplo |
| `GET /healthz` | Verificação de saúde |

Operação do serviço: `systemctl status ats-web`, `journalctl -u ats-web -f`.

### Publicação com Cloudflare

- **IP público**: registro `A` com proxy ativado e SSL **Full** (com certificado na origem, por exemplo via Certbot).
- **Cloudflare Tunnel**: `cloudflared tunnel create ats` e um `ingress` apontando para o Nginx local, sem abrir portas.

## Segurança

- O serviço escuta só em `127.0.0.1`, com upload limitado a 6 MB, sem banco e sem dados persistidos.
- Não há login. Para restringir o acesso, use Cloudflare Access ou `auth_basic` no Nginx, e uma regra de rate limiting para `/ats/api/*`.

## Tecnologias

Python · Flask · Gunicorn · python-docx · ReportLab · pypdf · HTML/CSS/JavaScript · Nginx · systemd · Cloudflare

## Créditos

Versão web baseada no projeto *resume-ats-linkedin-optimizer*, de João Vitor Amaral, distribuído sob a licença MIT. O aviso de copyright original está preservado em [LICENSE](LICENSE).

## Licença

MIT. Veja [LICENSE](LICENSE) (Copyright © 2026 João Vitor Amaral).
