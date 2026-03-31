import os, subprocess

styles_dir = 'src/pages/Home/styles'
files_order = []
with open('src/pages/Home/HomePage.css', 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if line.startswith('@import'):
            fname = line.split('/')[-1].rstrip("';")
            files_order.append(fname)

combined = ''
for fname in files_order:
    path = os.path.join(styles_dir, fname)
    with open(path, 'r', encoding='utf-8') as f:
        combined += f.read()

result = subprocess.run(['git', 'show', 'HEAD:src/pages/Home/HomePage.css'],
                        capture_output=True, text=True, encoding='utf-8')
original = result.stdout

def normalize(text):
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    return '\n'.join(lines)

orig_norm = normalize(original)
split_norm = normalize(combined)

print(f'Original normalized lines: {len(orig_norm.splitlines())}')
print(f'Split normalized lines: {len(split_norm.splitlines())}')

orig_lines = set(orig_norm.splitlines())
split_lines = set(split_norm.splitlines())

missing = orig_lines - split_lines
extra = split_lines - orig_lines

print(f'Lines in original but not in split: {len(missing)}')
print(f'Lines in split but not in original: {len(extra)}')

if missing:
    print('MISSING LINES (first 20):')
    for l in list(missing)[:20]:
        print(f'  {l[:120]}')
if extra:
    print('EXTRA LINES (first 10):')
    for l in list(extra)[:10]:
        print(f'  {l[:120]}')

if not missing:
    print('ALL original CSS content preserved in split files!')
