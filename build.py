"""鲸鱼娘 VS Code 皮肤构建脚本。

用法：
  python build.py                     # 用 art/ 里的素材生成 whale.css 和看板娘 .vsix
  python build.py --import <assets>   # 先从 dsh-deep-whale 的 maid-atelier/assets 导入素材到 art/

需要 Pillow（pip install pillow）。
"""
import argparse
import base64
import json
import sys
import zipfile
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
ART = HERE / "art"
MASCOT = HERE / "mascot"

# 名称 -> (源文件相对 assets/ 的路径, 最大宽, 最大高)
IMPORTS = {
    "palace": ("maid-atelier-palace-night-v4.webp", 1600, 1000),
    "maidRight": ("maid-atelier-maid-right-v7.webp", 640, 1200),
    "maidLeft": ("maid-atelier-maid-left-v5.webp", 560, 1000),
    "swag": ("runtime/cd728ce5c1794ec4958ef75c4cdd60a3d513b871bea99e3b526656f14089fd74.webp", 600, 160),
    "bow": ("runtime/dcf64a43ad6b9e71c24c91fb9b1d7fe8af534497fd421213472bea96e6bc04b5.webp", 120, 60),
    "corner": ("maid-sidebar-corner-v1.webp", 360, 360),
    "shield": ("maid-workspace-shield-v2.webp", 230, 320),
    "lace": ("maid-composer-lace-tile-v2.png", 123, 75),
    "trim": ("maid-bottom-trim-tile-v1.webp", 386, 30),
    "topTrim": ("runtime/e49115f3942ea5c5034c81016c61944b5261c8ea410318cb0419b445c990b063.webp", 386, 321),
    "ribbon": ("maid-workspace-ribbon-v2.webp", 600, 122),
    "crest": ("maid-bottom-crest-v1.webp", 240, 140),
    # 看板娘表情
    "mascot-normal": ("plugin-icon.png", 320, 320),
    "mascot-delighted": ("icons/delighted-cutout.png", 320, 320),
    "mascot-determined": ("icons/determined-cutout.png", 320, 320),
    "mascot-sleepy": ("icons/sleepy-cutout.png", 320, 320),
    "mascot-dizzy": ("runtime/405917afdb68d725624bbf7e4f1619a35fc4004039b7d553c5528ca5f65308d3.webp", 320, 320),
}


def import_art(assets: Path) -> None:
    ART.mkdir(exist_ok=True)
    for name, (rel, w, h) in IMPORTS.items():
        im = Image.open(assets / rel)
        im.thumbnail((w, h), Image.LANCZOS)
        out = ART / f"{name}.webp"
        im.save(out, "WEBP", quality=82, method=6)
        print(f"  {name:20s} {im.size[0]}x{im.size[1]}  {out.stat().st_size // 1024} KB")
    derive_art()


# 由导入的素材派生：顶部饰带拆成"深蓝金线"和"白蕾丝"两段，角花翻出四个方向。
DERIVED = ["navyBand", "laceBand", "cornerTL", "cornerTR", "cornerBL", "cornerBR"]


def derive_art() -> None:
    top = Image.open(ART / "topTrim.webp")
    top.crop((0, 0, top.width, 174)).save(ART / "navyBand.webp", "WEBP", quality=85)
    top.crop((0, 168, top.width, top.height)).save(ART / "laceBand.webp", "WEBP", quality=85)
    corner = Image.open(ART / "corner.webp")  # 原图是右上角朝向
    flips = {
        "cornerTR": corner,
        "cornerTL": corner.transpose(Image.FLIP_LEFT_RIGHT),
        "cornerBR": corner.transpose(Image.FLIP_TOP_BOTTOM),
        "cornerBL": corner.transpose(Image.ROTATE_180),
    }
    for name, im in flips.items():
        im.save(ART / f"{name}.webp", "WEBP", quality=85)


def data_uri(name: str) -> str:
    raw = (ART / f"{name}.webp").read_bytes()
    return "url('data:image/webp;base64," + base64.b64encode(raw).decode() + "')"


def build_css() -> Path:
    css = (HERE / "whale.template.css").read_text(encoding="utf-8")
    # 长名字先替换，避免 art(corner) 误伤 art(cornerTL)
    for name in sorted([*IMPORTS, *DERIVED], key=len, reverse=True):
        css = css.replace(f"art({name})", data_uri(name))
    if "art(" in css:
        sys.exit("whale.template.css 里有未知的 art(...) 名称")
    out = HERE / "whale.css"
    out.write_text(css, encoding="utf-8")
    print(f"  whale.css  {out.stat().st_size // 1024} KB")
    return out


CONTENT_TYPES = """<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension=".json" ContentType="application/json"/>
<Default Extension=".js" ContentType="application/javascript"/>
<Default Extension=".webp" ContentType="image/webp"/>
<Default Extension=".md" ContentType="text/markdown"/>
<Default Extension=".vsixmanifest" ContentType="text/xml"/>
</Types>"""


def vsix_manifest(pkg: dict) -> str:
    return f"""<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011" xmlns:d="http://schemas.microsoft.com/developer/vsx-schema-design/2011">
  <Metadata>
    <Identity Language="en-US" Id="{pkg['name']}" Version="{pkg['version']}" Publisher="{pkg['publisher']}"/>
    <DisplayName>{pkg['displayName']}</DisplayName>
    <Description xml:space="preserve">{pkg['description']}</Description>
    <Categories>Other</Categories>
    <Properties>
      <Property Id="Microsoft.VisualStudio.Code.Engine" Value="{pkg['engines']['vscode']}"/>
      <Property Id="Microsoft.VisualStudio.Code.ExtensionKind" Value="ui"/>
    </Properties>
  </Metadata>
  <Installation><InstallationTarget Id="Microsoft.VisualStudio.Code"/></Installation>
  <Dependencies/>
  <Assets>
    <Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true"/>
  </Assets>
</PackageManifest>"""


def build_vsix() -> Path:
    pkg = json.loads((MASCOT / "package.json").read_text(encoding="utf-8"))
    out = HERE / f"{pkg['name']}-{pkg['version']}.vsix"
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", CONTENT_TYPES)
        z.writestr("extension.vsixmanifest", vsix_manifest(pkg))
        z.write(MASCOT / "package.json", "extension/package.json")
        z.write(MASCOT / "extension.js", "extension/extension.js")
        z.write(HERE / "NOTICE.md", "extension/NOTICE.md")
        for mood in ("normal", "delighted", "determined", "sleepy", "dizzy"):
            z.write(ART / f"mascot-{mood}.webp", f"extension/media/{mood}.webp")
        z.write(ART / "lace.webp", "extension/media/lace.webp")
    print(f"  {out.name}  {out.stat().st_size // 1024} KB")
    return out


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--import", dest="assets", type=Path, help="dsh-deep-whale/maid-atelier/assets 路径")
    args = parser.parse_args()
    if args.assets:
        print("导入素材：")
        import_art(args.assets)
    print("生成：")
    build_css()
    build_vsix()


if __name__ == "__main__":
    main()
