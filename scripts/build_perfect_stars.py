from collections import deque
import math

def build_perfect_star(in_rgba, out_rgba, w, h, name, x_left, x_right, y_top, y_bot, cx, cy, out_size=512):
    with open(in_rgba, 'rb') as f:
        data = bytearray(f.read())

    # 1. Clear everything outside the bounding box
    for y in range(h):
        for x in range(w):
            idx = (y * w + x) * 4
            if x < x_left or x > x_right or y < y_top or y > y_bot:
                data[idx] = 255
                data[idx+1] = 255
                data[idx+2] = 255
                data[idx+3] = 255

    # 2. Clear CAD bounding box lines along the edges, leaving only the 20px ray caps
    # Top edge:
    for y in range(max(0, y_top - 3), min(h, y_top + 4)):
        for x in range(w):
            if x < cx - 11 or x > cx + 11:
                idx = (y * w + x) * 4
                data[idx] = 255; data[idx+1] = 255; data[idx+2] = 255; data[idx+3] = 255

    # Bottom edge:
    for y in range(max(0, y_bot - 3), min(h, y_bot + 4)):
        for x in range(w):
            if x < cx - 11 or x > cx + 11:
                idx = (y * w + x) * 4
                data[idx] = 255; data[idx+1] = 255; data[idx+2] = 255; data[idx+3] = 255

    # Left edge:
    for x in range(max(0, x_left - 3), min(w, x_left + 4)):
        for y in range(h):
            if y < cy - 11 or y > cy + 11:
                idx = (y * w + x) * 4
                data[idx] = 255; data[idx+1] = 255; data[idx+2] = 255; data[idx+3] = 255

    # Right edge:
    for x in range(max(0, x_right - 3), min(w, x_right + 4)):
        for y in range(h):
            if y < cy - 11 or y > cy + 11:
                idx = (y * w + x) * 4
                data[idx] = 255; data[idx+1] = 255; data[idx+2] = 255; data[idx+3] = 255

    # Clean the rounded cap tips so no tangent line stub remains
    # The top cap apex is at y_top. Semicircle cap above y_top + 8
    # If a pixel at y <= y_top + 5 is farther from (cx, y_top + 10) than radius 10.2:
    for y in range(y_top, y_top + 12):
        for x in range(int(cx) - 14, int(cx) + 15):
            dist = math.hypot(x - cx, y - (y_top + 10))
            if dist > 10.5:
                idx = (y * w + x) * 4
                data[idx] = 255; data[idx+1] = 255; data[idx+2] = 255; data[idx+3] = 255

    # Bottom cap apex is at y_bot. Semicircle cap below y_bot - 8
    for y in range(y_bot - 11, y_bot + 1):
        for x in range(int(cx) - 14, int(cx) + 15):
            dist = math.hypot(x - cx, y - (y_bot - 10))
            if dist > 10.5:
                idx = (y * w + x) * 4
                data[idx] = 255; data[idx+1] = 255; data[idx+2] = 255; data[idx+3] = 255

    # Left cap apex is at x_left. Semicircle cap to the left of x_left + 8
    for x in range(x_left, x_left + 12):
        for y in range(int(cy) - 14, int(cy) + 15):
            dist = math.hypot(x - (x_left + 10), y - cy)
            if dist > 10.5:
                idx = (y * w + x) * 4
                data[idx] = 255; data[idx+1] = 255; data[idx+2] = 255; data[idx+3] = 255

    # Right cap apex is at x_right. Semicircle cap to the right of x_right - 8
    for x in range(x_right - 11, x_right + 1):
        for y in range(int(cy) - 14, int(cy) + 15):
            dist = math.hypot(x - (x_right - 10), y - cy)
            if dist > 10.5:
                idx = (y * w + x) * 4
                data[idx] = 255; data[idx+1] = 255; data[idx+2] = 255; data[idx+3] = 255

    # 3. Flood-fill from borders to identify all exterior background pixels
    is_bg = bytearray(w * h)
    q = deque()

    for x in range(w):
        q.append((x, 0))
        q.append((x, h - 1))
        is_bg[0 * w + x] = 1
        is_bg[(h - 1) * w + x] = 1
    for y in range(h):
        q.append((0, y))
        q.append((w - 1, y))
        is_bg[y * w + 0] = 1
        is_bg[y * w + (w - 1)] = 1

    # In this clean canvas, exterior background is white (R >= 220, G >= 220, B >= 220)
    # The star's perimeter is sealed by the dark outline of the rays (darkness < 120) and colors
    while q:
        x, y = q.popleft()
        for nx, ny in [(x+1, y), (x-1, y), (x, y+1), (x, y-1)]:
            if 0 <= nx < w and 0 <= ny < h:
                n_idx = ny * w + nx
                if not is_bg[n_idx]:
                    p_idx = n_idx * 4
                    r, g, b = data[p_idx], data[p_idx+1], data[p_idx+2]
                    # Any pixel that is light (R>=225, G>=225, B>=225)
                    if r >= 225 and g >= 225 and b >= 225:
                        is_bg[n_idx] = 1
                        q.append((nx, ny))

    # 4. Anti-aliasing defringing on the outer edge
    for y in range(h):
        for x in range(w):
            idx = (y * w + x) * 4
            if is_bg[y * w + x]:
                # Transparent exterior
                data[idx] = 0
                data[idx+1] = 0
                data[idx+2] = 0
                data[idx+3] = 0
            else:
                # Check if it borders the exterior
                borders_bg = False
                for nx, ny in [(x+1, y), (x-1, y), (x, y+1), (x, y-1)]:
                    if 0 <= nx < w and 0 <= ny < h and is_bg[ny * w + nx]:
                        borders_bg = True
                        break
                
                if borders_bg:
                    r, g, b = data[idx], data[idx+1], data[idx+2]
                    brightness = (r + g + b) / 3.0
                    if brightness > 180:
                        # Smooth alpha rolloff
                        alpha = max(0, min(255, int((255.0 - brightness) / 75.0 * 255.0)))
                        data[idx+3] = alpha
                        # Defringe color (blend towards dark charcoal outline)
                        blend = alpha / 255.0
                        data[idx] = int(r * blend + 30 * (1 - blend))
                        data[idx+1] = int(g * blend + 30 * (1 - blend))
                        data[idx+2] = int(b * blend + 30 * (1 - blend))

    # 5. Place centered onto out_size x out_size square canvas
    out_data = bytearray(out_size * out_size * 4)
    out_cx, out_cy = out_size / 2.0, out_size / 2.0
    offset_x = int(round(out_cx - cx))
    offset_y = int(round(out_cy - cy))

    for y in range(h):
        out_y = y + offset_y
        if 0 <= out_y < out_size:
            for x in range(w):
                out_x = x + offset_x
                if 0 <= out_x < out_size:
                    in_idx = (y * w + x) * 4
                    out_idx = (out_y * out_size + out_x) * 4
                    out_data[out_idx:out_idx+4] = data[in_idx:in_idx+4]

    with open(out_rgba, 'wb') as f:
        f.write(out_data)

    print(f"Built perfect star for {name}!")

build_perfect_star('/tmp/gold.rgba', '/tmp/gold_perfect.rgba', 580, 522, 'Gold', 96, 545, 56, 504, 320.5, 280.0, 512)
build_perfect_star('/tmp/silver.rgba', '/tmp/silver_perfect.rgba', 539, 535, 'Silver', 61, 510, 52, 500, 285.5, 276.0, 512)
