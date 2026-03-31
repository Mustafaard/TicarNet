import os, subprocess

styles_dir = 'src/pages/Home/styles'

# Get all split CSS files and concatenate
combined_lines = []
for fname in sorted(os.listdir(styles_dir)):
    if fname.endswith('.css'):
        with open(os.path.join(styles_dir, fname), 'r', encoding='utf-8') as f:
            for line in f:
                combined_lines.append(line.rstrip('\n'))

# Get original from git
result = subprocess.run(['git', 'show', 'HEAD:src/pages/Home/HomePage.css'],
                        capture_output=True, text=True, encoding='utf-8')
original_lines = result.stdout.split('\n')

# Normalize both: strip whitespace, remove empty
def to_set(lines):
    return set(l.strip() for l in lines if l.strip())

orig_set = to_set(original_lines)
split_set = to_set(combined_lines)

missing = orig_set - split_set
extra = split_set - orig_set

print(f'Original unique non-empty lines: {len(orig_set)}')
print(f'Split unique non-empty lines: {len(split_set)}')
print(f'Missing from split: {len(missing)}')
print(f'Extra in split: {len(extra)}')

if missing:
    print('\nMISSING (first 30):')
    for l in sorted(missing)[:30]:
        print(f'  {l[:150]}')
else:
    print('\nALL original CSS content preserved!')
