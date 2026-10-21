"""ATS Resume Optimizer — servidor Flask.

Roda atrás do nginx em /ats (proxy_pass para 127.0.0.1:8095). O frontend usa
URLs relativas, então funciona tanto em /ats/ quanto na raiz.
"""
from __future__ import annotations

import contextlib
import io
import json
import os
import re
import tempfile
import threading
from argparse import Namespace
from pathlib import Path

from flask import Flask, abort, jsonify, request, send_file, send_from_directory

import audit
import resume_tools as rt

BASE = Path(__file__).resolve().parent
DATA = BASE / "data"
STATIC = BASE / "static"

app = Flask(__name__, static_folder=None)
app.config["MAX_CONTENT_LENGTH"] = 6 * 1024 * 1024  # 6 MB
_render_lock = threading.Lock()  # resume_tools.LANG é global

GUIDES = {
    "ats-e-formatacao": ("01 · ATS e formatação", DATA / "references/01-ats-and-formatting.md"),
    "conteudo-e-bullets": ("02 · Conteúdo e bullets", DATA / "references/02-content-and-bullets.md"),
    "palavras-chave": ("03 · Palavras-chave e adaptação", DATA / "references/03-keywords-and-tailoring.md"),
    "linkedin": ("04 · LinkedIn", DATA / "references/04-linkedin.md"),
    "perfil-mestre": ("05 · Perfil mestre", DATA / "references/05-master-profile.md"),
    "avaliacao": ("06 · Pontuação e avaliação", DATA / "references/06-scoring-and-evaluation.md"),
    "mitos": ("07 · Mitos e verdades", DATA / "references/07-myths-and-truth.md"),
    "carta": ("08 · Carta de apresentação", DATA / "references/08-cover-letters.md"),
    "verbos": ("Verbos de ação", DATA / "action-verbs.md"),
    "metricas": ("Proxies de métricas", DATA / "metric-proxies.md"),
    "slop": ("Lista anti-clichê (IA)", DATA / "ai-slop-blacklist.md"),
    "template-perfil": ("Template do perfil mestre", DATA / "master-profile-template.md"),
}


def _run(fn, **kw):
    """Chama um cmd_* de resume_tools e captura o JSON impresso."""
    buf, err = io.StringIO(), io.StringIO()
    code = 0
    try:
        with contextlib.redirect_stdout(buf), contextlib.redirect_stderr(err):
            code = fn(Namespace(**kw))
    except SystemExit as e:
        raise ValueError(str(e.code))
    out = buf.getvalue().strip()
    try:
        return json.loads(out), code
    except json.JSONDecodeError:
        return {"raw": out}, code


def _tmpjson(obj) -> str:
    f = tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8")
    json.dump(obj, f, ensure_ascii=False)
    f.close()
    return f.name


def _body() -> dict:
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        abort(400, "JSON inválido")
    return data


@app.errorhandler(400)
@app.errorhandler(413)
def _err(e):
    return jsonify({"error": getattr(e, "description", "requisição inválida")}), e.code


# ---------------------------------------------------------------- páginas

@app.get("/")
def index():
    return send_from_directory(STATIC, "index.html")


@app.get("/static/<path:p>")
def static_files(p):
    return send_from_directory(STATIC, p)


@app.get("/healthz")
def health():
    return jsonify(ok=True)


# ---------------------------------------------------------------- API

@app.get("/api/example")
def example():
    return send_file(DATA / "example-resume.json", mimetype="application/json")


@app.get("/api/schema")
def schema():
    return send_file(DATA / "resume.schema.json", mimetype="application/json")


@app.get("/api/guides")
def guides():
    return jsonify([{"id": k, "title": v[0]} for k, v in GUIDES.items()])


@app.get("/api/guides/<gid>")
def guide(gid):
    if gid not in GUIDES:
        abort(404)
    return jsonify({"id": gid, "title": GUIDES[gid][0], "markdown": GUIDES[gid][1].read_text(encoding="utf-8")})


@app.post("/api/analyze")
def analyze():
    d = _body()
    resume = d.get("resume")
    if not isinstance(resume, dict):
        abort(400, "campo 'resume' ausente")
    jd = (d.get("jd") or "").strip()
    source = d.get("source") if isinstance(d.get("source"), dict) else None

    paths = [_tmpjson(resume)]
    try:
        slop, _ = _run(rt.cmd_deslop, resume=paths[0])
        if source:
            paths.append(_tmpjson(source))
        valid, _ = _run(rt.cmd_validate, resume=paths[0], source=paths[1] if source else None)
        cov = None
        if jd:
            cov, _ = _run(rt.cmd_coverage, resume=paths[0], jd=jd[:20000])
        return jsonify(slop=slop, validate=valid, coverage=cov)
    except ValueError as e:
        abort(400, str(e))
    finally:
        for p in paths:
            with contextlib.suppress(OSError):
                os.unlink(p)


@app.post("/api/render")
def render():
    d = _body()
    resume = d.get("resume")
    if not isinstance(resume, dict) or not resume.get("basics", {}).get("name"):
        abort(400, "Preencha ao menos o nome em 'basics'.")
    fmt = d.get("format", "pdf")
    if fmt not in ("pdf", "docx"):
        abort(400, "formato deve ser pdf ou docx")
    lang = d.get("lang", "pt")
    lang = lang if lang in rt.LABELS else "pt"

    safe = re.sub(r"[^A-Za-z0-9]+", "-", resume["basics"]["name"]).strip("-") or "Curriculo"
    fname = f"{safe}-Curriculo.{fmt}"
    src = _tmpjson(resume)
    out = tempfile.NamedTemporaryFile(suffix=f".{fmt}", delete=False).name
    try:
        with _render_lock:
            rt.LANG = lang
            _, code = _run(rt.cmd_render, resume=src, out=out, format=fmt)
        data = Path(out).read_bytes()
    except ValueError as e:
        abort(400, str(e))
    finally:
        for p in (src, out):
            with contextlib.suppress(OSError):
                os.unlink(p)
    mime = "application/pdf" if fmt == "pdf" else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    return send_file(io.BytesIO(data), mimetype=mime, as_attachment=True, download_name=fname)


@app.post("/api/audit")
def audit_route():
    f = request.files.get("file")
    if not f:
        abort(400, "envie um arquivo no campo 'file'")
    try:
        return jsonify(audit.audit_file(f.filename, f.read(), request.form.get("jd", "")[:20000]))
    except ValueError as e:
        abort(400, str(e))
    except Exception as e:  # arquivo corrompido etc.
        abort(400, f"Não foi possível ler o arquivo: {type(e).__name__}")


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.environ.get("PORT", 8095)), debug=False)
