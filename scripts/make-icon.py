"""把截图里的宠物裁出来，生成应用图标、托盘图标和 .ico。

用法（在项目根目录）：
    python scripts/make-icon.py
"""

from PIL import Image, ImageDraw

SOURCE = "assets/icon-source.png"

src = Image.open(SOURCE).convert("RGBA")
pet = src.crop(src.getbbox())

SIZE = 256
canvas = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
draw = ImageDraw.Draw(canvas)

# 柔和的奶油色圆底，让小尺寸下也看得清
draw.ellipse(
    (8, 8, SIZE - 8, SIZE - 8),
    fill=(255, 243, 221, 255),
    outline=(242, 211, 191, 255),
    width=6,
)

max_w, max_h = 196, 196
ratio = min(max_w / pet.width, max_h / pet.height)
pet = pet.resize(
    (round(pet.width * ratio), round(pet.height * ratio)),
    Image.LANCZOS,
)

x = (SIZE - pet.width) // 2
y = (SIZE - pet.height) // 2 + 6
canvas.alpha_composite(pet, (x, y))

canvas.save("assets/icon.png")
canvas.save(
    "assets/icon.ico",
    sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
)
canvas.resize((32, 32), Image.LANCZOS).save("assets/tray.png")
canvas.resize((64, 64), Image.LANCZOS).save("assets/tray@2x.png")

print("generated assets/icon.png, assets/icon.ico, assets/tray.png, assets/tray@2x.png")
