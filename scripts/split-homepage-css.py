#!/usr/bin/env python3
"""
Split HomePage.css (~31K lines) into ~50 feature-based CSS files.
Creates styles/*.css files and rewrites HomePage.css with @import statements.
Preserves exact CSS content and cascade order.
"""

import re
import os
from collections import OrderedDict

CSS_PATH = os.path.join(os.path.dirname(__file__), '..', 'src', 'pages', 'Home', 'HomePage.css')
STYLES_DIR = os.path.join(os.path.dirname(__file__), '..', 'src', 'pages', 'Home', 'styles')

# ── Feature mapping: prefix → file name ──────────────────────────────────
# Order matters: first match wins. More specific prefixes first.
PREFIX_TO_FILE = OrderedDict([
    # Home shell & page frame
    ('home-shell',       '01-home-shell'),
    ('home-page',        '01-home-shell'),
    ('home-sections',    '01-home-shell'),
    ('home-booting',     '01-home-shell'),
    ('home-floating',    '01-home-shell'),
    ('home-daily',       '01-home-shell'),
    ('home-weekly',      '01-home-shell'),
    ('home-tab',         '01-home-shell'),

    # HUD & wallet
    ('hud-pill',         '02-hud'),
    ('hud-brand',        '02-hud'),
    ('hud-grid',         '02-hud'),
    ('hud-quick',        '02-hud'),
    ('hud-actions',      '02-hud'),
    ('hud-topbar',       '02-hud'),
    ('hud-top',          '02-hud'),
    ('hud',              '02-hud'),
    ('wallet-pill',      '02-hud'),
    ('wallet-dock',      '02-hud'),

    # Hero section
    ('hero-level',       '03-hero'),
    ('hero-premium',     '03-hero'),
    ('hero-avatar',      '03-hero'),
    ('hero-card',        '03-hero'),
    ('hero-name',        '03-hero'),
    ('hero-username',    '03-hero'),
    ('hero-xp',          '03-hero'),
    ('hero-head',        '03-hero'),
    ('hero-mini',        '03-hero'),
    ('hero-main',        '03-hero'),
    ('hero-info',        '03-hero'),
    ('hero-role',        '03-hero'),
    ('hero-action',      '03-hero'),
    ('hero-city',        '03-hero'),
    ('hero-user',        '03-hero'),
    ('hero-meta',        '03-hero'),
    ('hero-meter',       '03-hero'),
    ('hero-actions',     '03-hero'),

    # Navigation
    ('mobile-nav',       '04-nav'),
    ('nav-theme',        '04-nav'),

    # City menu
    ('city-menu',        '05-city-menu'),
    ('city-module',      '05-city-menu'),
    ('menu-grid',        '05-city-menu'),
    ('menu-section',     '05-city-menu'),

    # Module grid
    ('module-btn',       '06-modules'),
    ('module-icon',      '06-modules'),
    ('module-grid',      '06-modules'),
    ('module-quick',     '06-modules'),
    ('module-label',     '06-modules'),
    ('module-desc',      '06-modules'),
    ('module-copy',      '06-modules'),
    ('module-card',      '06-modules'),

    # Business
    ('business-screen',  '07-business'),

    # Factory - purchase panel (specific)
    ('factory-purchase', '08-factory-purchase'),

    # Factory - shop
    ('factory-shop',     '09-factory-shop'),

    # Factory - screen & cards
    ('factory-screen',   '10-factory-screen'),
    ('factory-card',     '10-factory-screen'),
    ('factory-grid',     '10-factory-screen'),

    # Factory - upgrade & build
    ('factory-upgrade',  '11-factory-upgrade'),
    ('factory-hub',      '11-factory-upgrade'),
    ('factory-build',    '11-factory-upgrade'),

    # Factory - production & operations
    ('factory-production', '12-factory-production'),
    ('factory-collect',    '12-factory-production'),
    ('factory-cost',       '12-factory-production'),
    ('factory-kpi',        '12-factory-production'),
    ('factory-level',      '12-factory-production'),

    # Factory - owned / state
    ('factory-owned',    '13-factory-owned'),
    ('factory-state',    '13-factory-owned'),
    ('factory-status',   '13-factory-owned'),
    ('factory-action',   '13-factory-owned'),
    ('factory-actions',  '13-factory-owned'),

    # Factory - misc
    ('factory-section',  '14-factory-misc'),
    ('factory-head',     '14-factory-misc'),
    ('factory-summary',  '14-factory-misc'),
    ('factory-buy',      '14-factory-misc'),
    ('factory-scroll',   '14-factory-misc'),
    ('factory-max',      '14-factory-misc'),
    ('factory-banner',   '14-factory-misc'),
    ('factory-modal',    '14-factory-misc'),
    ('factory-bulk',     '14-factory-misc'),

    # Mines
    ('mines-screen',     '15-mines'),
    ('mine-card',        '15-mines'),
    ('mine-confirm',     '15-mines'),
    ('mine-dig',         '15-mines'),
    ('mines-head',       '15-mines'),
    ('mines-title',      '15-mines'),
    ('mines-summary',    '15-mines'),
    ('mines-back',       '15-mines'),

    # Marketplace - buy
    ('marketplace-buy',  '16-marketplace-buy'),

    # Marketplace - sell
    ('marketplace-sell', '17-marketplace-sell'),

    # Marketplace - listing
    ('marketplace-listing',  '18-marketplace-listing'),
    ('marketplace-listings', '18-marketplace-listing'),

    # Marketplace - core & layout
    ('marketplace-screen',   '19-marketplace-core'),
    ('marketplace-tab',      '19-marketplace-core'),
    ('marketplace-tabs',     '19-marketplace-core'),
    ('marketplace-filter',   '19-marketplace-core'),
    ('marketplace-filters',  '19-marketplace-core'),
    ('marketplace-section',  '19-marketplace-core'),
    ('marketplace-top',      '19-marketplace-core'),
    ('marketplace-nakit',    '19-marketplace-core'),
    ('marketplace-capacity', '19-marketplace-core'),
    ('marketplace-block',    '19-marketplace-core'),
    ('marketplace-wallet',   '19-marketplace-core'),
    ('marketplace-system',   '19-marketplace-core'),
    ('marketplace-title',    '19-marketplace-core'),
    ('marketplace-subtitle', '19-marketplace-core'),
    ('marketplace-panel',    '19-marketplace-core'),
    ('marketplace-modal',    '19-marketplace-core'),
    ('marketplace-list',     '19-marketplace-core'),
    ('marketplace-seller',   '19-marketplace-core'),

    # Fleet - detail
    ('fleet-detail',     '20-fleet-detail'),

    # Fleet - listing
    ('fleet-listing',    '21-fleet-listing'),

    # Fleet - market
    ('fleet-market',     '22-fleet-market'),

    # Fleet - accountant
    ('fleet-accountant', '23-fleet-accountant'),

    # Fleet - upgrade
    ('fleet-upgrade',    '24-fleet-upgrade'),

    # Fleet - company
    ('fleet-company',    '25-fleet-company'),

    # Fleet - order & setup
    ('fleet-order',      '26-fleet-order'),
    ('fleet-setup',      '26-fleet-order'),

    # Fleet - bulk
    ('fleet-bulk',       '27-fleet-bulk'),

    # Fleet - compact
    ('fleet-compact',    '28-fleet-compact'),

    # Fleet - owned & active
    ('fleet-owned',      '29-fleet-owned'),
    ('fleet-active',     '29-fleet-owned'),

    # Fleet - misc
    ('fleet-vehicle',    '30-fleet-misc'),
    ('fleet-hero',       '30-fleet-misc'),
    ('fleet-tier',       '30-fleet-misc'),
    ('fleet-scrap',      '30-fleet-misc'),
    ('fleet-filter',     '30-fleet-misc'),
    ('fleet-sold',       '30-fleet-misc'),
    ('fleet-overview',   '30-fleet-misc'),
    ('fleet-stat',       '30-fleet-misc'),
    ('fleet-main',       '30-fleet-misc'),
    ('fleet-sub',        '30-fleet-misc'),
    ('fleet-summary',    '30-fleet-misc'),
    ('fleet-collect',    '30-fleet-misc'),
    ('fleet-info',       '30-fleet-misc'),
    ('fleet-secretary',  '30-fleet-misc'),
    ('fleet-gallery',    '30-fleet-misc'),
    ('fleet-note',       '30-fleet-misc'),
    ('fleet-premium',    '30-fleet-misc'),
    ('fleet-mini',       '30-fleet-misc'),
    ('fleet-subheader',  '30-fleet-misc'),
    ('fleet-tabs',       '30-fleet-misc'),
    ('fleet-cash',       '30-fleet-misc'),
    ('fleet-live',       '30-fleet-misc'),
    ('fleet-chip',       '30-fleet-misc'),
    ('fleet-brand',      '30-fleet-misc'),
    ('fleet-sale',       '30-fleet-misc'),
    ('fleet-fullscreen', '30-fleet-misc'),
    ('fleet-net',        '30-fleet-misc'),

    # Logistics
    ('logistics-summary', '31-logistics'),
    ('logistics-truck',   '31-logistics'),

    # Garage
    ('garage-teklif',   '32-garage'),

    # Bank
    ('bank-screen',     '33-bank'),
    ('bank-term',       '33-bank'),
    ('bank-hero',       '33-bank'),
    ('bank-field',      '33-bank'),
    ('bank-block',      '33-bank'),
    ('bank-history',    '33-bank'),
    ('bank-panel',      '33-bank'),
    ('bank-status',     '33-bank'),
    ('bank-stat',       '33-bank'),
    ('bank-stats',      '33-bank'),
    ('bank-preview',    '33-bank'),
    ('bank-max',        '33-bank'),
    ('bank-ops',        '33-bank'),
    ('bank-empty',      '33-bank'),

    # Leaderboard
    ('leaderboard-row',       '34-leaderboard'),
    ('leaderboard-podium',    '34-leaderboard'),
    ('leaderboard-search',    '34-leaderboard'),
    ('leaderboard-pager',     '34-leaderboard'),
    ('leaderboard-countdown', '34-leaderboard'),
    ('leaderboard-me',        '34-leaderboard'),
    ('leaderboard-card',      '34-leaderboard'),
    ('leaderboard-inline',    '34-leaderboard'),
    ('leaderboard-top',       '34-leaderboard'),
    ('leaderboard-hero',      '34-leaderboard'),
    ('leaderboard-rewards',   '34-leaderboard'),
    ('leaderboard-rank',      '34-leaderboard'),
    ('leaderboard-username',  '34-leaderboard'),
    ('leaderboard-score',     '34-leaderboard'),
    ('leaderboard-season',    '34-leaderboard'),
    ('leaderboard-metric',    '34-leaderboard'),
    ('leaderboard-metrics',   '34-leaderboard'),
    ('leaderboard-title',     '34-leaderboard'),
    ('leaderboard-head',      '34-leaderboard'),
    ('leaderboard-table',     '34-leaderboard'),
    ('leaderboard-player',    '34-leaderboard'),
    ('leaderboard-list',      '34-leaderboard'),

    # Chat - community & screen
    ('chat-community',  '35-chat-community'),
    ('chat-screen',     '35-chat-community'),
    ('chat-lock',       '35-chat-community'),
    ('chat-feed',       '35-chat-community'),
    ('chat-compose',    '35-chat-community'),
    ('chat-form',       '35-chat-community'),
    ('chat-card',       '35-chat-community'),
    ('chat-presence',   '35-chat-community'),
    ('chat-side',       '35-chat-community'),
    ('chat-inline',     '35-chat-community'),
    ('chat-feedback',   '35-chat-community'),
    ('chat-room',       '35-chat-community'),
    ('chat-title',      '35-chat-community'),
    ('chat-empty',      '35-chat-community'),

    # Chat - messages & bubbles
    ('chat-msg',        '36-chat-messages'),
    ('chat-message',    '36-chat-messages'),
    ('chat-send',       '36-chat-messages'),
    ('chat-bubble',     '36-chat-messages'),
    ('chat-reply',      '36-chat-messages'),
    ('chat-avatar',     '36-chat-messages'),
    ('chat-user',       '36-chat-messages'),
    ('chat-rozet',      '36-chat-messages'),
    ('chat-level',      '36-chat-messages'),
    ('chat-jump',       '36-chat-messages'),
    ('chat-live',       '36-chat-messages'),
    ('chat-thread',     '36-chat-messages'),
    ('chat-report',     '36-chat-messages'),

    # Chat - news tab
    ('chat-news',        '37-chat-news'),
    ('announcements-board',  '37-chat-news'),
    ('announcements-hero',   '37-chat-news'),
    ('announcements-screen', '37-chat-news'),
    ('announcement-entry',   '37-chat-news'),
    ('announcement-card',    '37-chat-news'),

    # Chat - rules tab
    ('chat-rules',      '38-chat-rules'),
    ('rules-intro',     '38-chat-rules'),
    ('rules-group',     '38-chat-rules'),
    ('rules-penalty',   '38-chat-rules'),
    ('rules-final',     '38-chat-rules'),
    ('rules-screen',    '38-chat-rules'),

    # DM & messages
    ('message-sohbet',   '39-dm-messages'),
    ('message-gold',     '39-dm-messages'),
    ('message-item',     '39-dm-messages'),
    ('message-highlight','39-dm-messages'),
    ('message-hero',     '39-dm-messages'),
    ('message-compose',  '39-dm-messages'),
    ('message-feed',     '39-dm-messages'),
    ('message-screen',   '39-dm-messages'),
    ('message-filter',   '39-dm-messages'),
    ('message-reply',    '39-dm-messages'),
    ('dm-report',        '39-dm-messages'),

    # Player profile
    ('player-profile',      '40-player-profile'),
    ('profile-event',       '40-player-profile'),
    ('profile-avatar',      '40-player-profile'),
    ('profile-performance', '40-player-profile'),
    ('profile-networth',    '40-player-profile'),
    ('profile-account',     '40-player-profile'),
    ('profile-rank',        '40-player-profile'),
    ('profile-legal',       '40-player-profile'),
    ('profile-input',       '40-player-profile'),
    ('profile-security',    '40-player-profile'),
    ('profile-identity',    '40-player-profile'),
    ('profile-update',      '40-player-profile'),
    ('profile-tool',        '40-player-profile'),
    ('profile-summary',     '40-player-profile'),
    ('profile-head',        '40-player-profile'),
    ('profile-updates',     '40-player-profile'),
    ('profile-logout',      '40-player-profile'),
    ('profile-danger',      '40-player-profile'),

    # Settings
    ('settings-theme',    '41-settings'),
    ('settings-screen',   '41-settings'),
    ('settings-section',  '41-settings'),
    ('settings-action',   '41-settings'),
    ('settings-security', '41-settings'),
    ('settings-avatar',   '41-settings'),
    ('settings-danger',   '41-settings'),
    ('settings-field',    '41-settings'),
    ('settings-input',    '41-settings'),
    ('settings-url',      '41-settings'),
    ('settings-textarea', '41-settings'),
    ('settings-helper',   '41-settings'),
    ('settings-inline',   '41-settings'),

    # Avatar
    ('avatar-crop',    '42-avatar'),
    ('avatar-confirm', '42-avatar'),
    ('avatar-file',    '42-avatar'),

    # Premium
    ('premium-daily',   '43-premium'),
    ('premium-plan',    '43-premium'),
    ('premium-status',  '43-premium'),
    ('premium-screen',  '43-premium'),
    ('premium-hero',    '43-premium'),
    ('premium-market',  '43-premium'),
    ('premium-benefit', '43-premium'),
    ('premium-gold',    '43-premium'),
    ('premium-kpi',     '43-premium'),
    ('premium-card',    '43-premium'),
    ('premium-balance', '43-premium'),
    ('premium-brand',   '43-premium'),
    ('premium-avatar',  '43-premium'),
    ('premium-title',   '43-premium'),
    ('premium-plans',   '43-premium'),
    ('premium-benefits','43-premium'),

    # Diamond
    ('diamond-pack',   '44-diamond'),
    ('diamond-market', '44-diamond'),

    # Daily login
    ('daily-login',    '45-daily-login'),

    # Missions
    ('mission-card',     '46-missions'),
    ('mission-reward',   '46-missions'),
    ('mission-money',    '46-missions'),
    ('mission-progress', '46-missions'),
    ('mission-status',   '46-missions'),
    ('mission-slot',     '46-missions'),
    ('mission-claim',    '46-missions'),
    ('mission-order',    '46-missions'),
    ('mission-head',     '46-missions'),
    ('missions-grid',    '46-missions'),
    ('missions-summary', '46-missions'),
    ('missions-screen',  '46-missions'),
    ('missions-card',    '46-missions'),
    ('missions-header',  '46-missions'),
    ('missions-subtitle','46-missions'),
    ('missions-layout',  '46-missions'),

    # Weekly events
    ('weekly-event',  '47-weekly-events'),
    ('weekly-events', '47-weekly-events'),

    # Season
    ('season-chest',   '48-season'),
    ('season-chests',  '48-season'),
    ('season-reward',  '48-season'),
    ('season-rewards', '48-season'),
    ('season-modal',   '48-season'),

    # Forex
    ('forex-chart',  '49-forex'),
    ('forex-solo',   '49-forex'),
    ('forex-trade',  '49-forex'),
    ('forex-axis',   '49-forex'),
    ('forex-panel',  '49-forex'),
    ('forex-live',   '49-forex'),
    ('forex-hover',  '49-forex'),
    ('forex-qty',    '49-forex'),
    ('forex-screen', '49-forex'),
    ('forex-grid',   '49-forex'),
    ('forex-area',   '49-forex'),
    ('forex-line',   '49-forex'),
    ('forex-point',  '49-forex'),
    ('forex-min',    '49-forex'),
    ('forex-max',    '49-forex'),
    ('forex-hit',    '49-forex'),
    ('forex-form',   '49-forex'),
    ('forex-client', '49-forex'),

    # Warehouse
    ('warehouse-modal',   '50-warehouse'),
    ('warehouse-item',    '50-warehouse'),
    ('warehouse-overlay', '50-warehouse'),
    ('warehouse-head',    '50-warehouse'),
    ('warehouse-total',   '50-warehouse'),
    ('warehouse-grid',    '50-warehouse'),
    ('warehouse-x',       '50-warehouse'),
    ('warehouse-foot',    '50-warehouse'),

    # Tutorial
    ('tutorial-coach',    '51-tutorial'),
    ('tutorial-task',     '51-tutorial'),
    ('tutorial-modal',    '51-tutorial'),
    ('tutorial-assistant','51-tutorial'),
    ('tutorial-purpose',  '51-tutorial'),
    ('tutorial-target',   '51-tutorial'),
    ('tutorial-objective','51-tutorial'),
    ('tutorial-actions',  '51-tutorial'),
    ('tutorial-resume',   '51-tutorial'),
    ('tutorial-overlay',  '51-tutorial'),
    ('tutorial-layout',   '51-tutorial'),
    ('tutorial-progress', '51-tutorial'),
    ('tutorial-plan',     '51-tutorial'),
    ('tutorial-points',   '51-tutorial'),
    ('tutorial-kpi',      '51-tutorial'),
    ('tutorial-pitfall',  '51-tutorial'),
    ('tutorial-continue', '51-tutorial'),
    ('tutorial-main',     '51-tutorial'),
    ('tutorial-title',    '51-tutorial'),
    ('tutorial-step',     '51-tutorial'),
    ('tutorial-lead',     '51-tutorial'),
    ('tutorial-gate',     '51-tutorial'),
    ('tutorial-metrics',  '51-tutorial'),
    ('tutorial-head',     '51-tutorial'),

    # Penalized users
    ('penalized-user',  '52-penalized'),
    ('penalized-users', '52-penalized'),
    ('penalized-badge', '52-penalized'),

    # Starter / unlock
    ('starter-detail', '53-starter'),
    ('unlock-node',    '53-starter'),
    ('unlock-tree',    '53-starter'),

    # Chat tabs (community tab strip)
    ('tab-strip',      '54-tab-strip'),
    ('tab-content',    '54-tab-strip'),
])

# Broad generic prefix fallbacks (checked if specific prefix not found)
BROAD_PREFIX_MAP = {
    'home':          '01-home-shell',
    'hud':           '02-hud',
    'hero':          '03-hero',
    'mobile':        '04-nav',
    'nav':           '04-nav',
    'city':          '05-city-menu',
    'menu':          '05-city-menu',
    'module':        '06-modules',
    'business':      '07-business',
    'factory':       '14-factory-misc',
    'mine':          '15-mines',
    'mines':         '15-mines',
    'marketplace':   '19-marketplace-core',
    'fleet':         '30-fleet-misc',
    'logistics':     '31-logistics',
    'garage':        '32-garage',
    'bank':          '33-bank',
    'leaderboard':   '34-leaderboard',
    'chat':          '35-chat-community',
    'announcement':  '37-chat-news',
    'announcements': '37-chat-news',
    'rules':         '38-chat-rules',
    'message':       '39-dm-messages',
    'dm':            '39-dm-messages',
    'player':        '40-player-profile',
    'profile':       '40-player-profile',
    'settings':      '41-settings',
    'avatar':        '42-avatar',
    'premium':       '43-premium',
    'diamond':       '44-diamond',
    'daily':         '45-daily-login',
    'mission':       '46-missions',
    'missions':      '46-missions',
    'weekly':        '47-weekly-events',
    'season':        '48-season',
    'forex':         '49-forex',
    'warehouse':     '50-warehouse',
    'tutorial':      '51-tutorial',
    'penalized':     '52-penalized',
    'starter':       '53-starter',
    'unlock':        '53-starter',
    'tab':           '54-tab-strip',
    'wallet':        '02-hud',
    'orderbook':     '22-fleet-market',
    'private':       '18-marketplace-listing',
}

# ── CSS parsing ──────────────────────────────────────────────────────────

def extract_class_prefixes(line):
    """Extract CSS class prefixes from a selector line."""
    prefixes = []
    for m in re.finditer(r'\.([a-zA-Z][a-zA-Z0-9]*(?:-[a-zA-Z]+)?)', line):
        prefixes.append(m.group(1))
    return prefixes


def classify_prefix(prefix):
    """Map a class prefix to a feature file name."""
    # Exact match first
    if prefix in PREFIX_TO_FILE:
        return PREFIX_TO_FILE[prefix]

    # Try broad prefix (first word before -)
    broad = prefix.split('-')[0] if '-' in prefix else prefix
    if broad in BROAD_PREFIX_MAP:
        return BROAD_PREFIX_MAP[broad]

    return None


def classify_block(block_lines):
    """Determine which feature file a CSS block belongs to."""
    votes = {}
    for line in block_lines:
        for prefix in extract_class_prefixes(line):
            feature = classify_prefix(prefix)
            if feature:
                votes[feature] = votes.get(feature, 0) + 1

    if not votes:
        return None

    # Return the feature with most votes
    return max(votes, key=votes.get)


def parse_css_blocks(lines):
    """
    Parse CSS into top-level blocks.
    A block is: a comment section + the rules that follow it until the next
    top-level block, or just rules between blocks.
    We split at every line where brace depth returns to 0.
    """
    blocks = []
    current_block = []
    depth = 0

    for line in lines:
        current_block.append(line)
        # Count braces (ignoring those in strings/comments is complex,
        # but CSS class names don't contain braces so this is safe enough)
        depth += line.count('{') - line.count('}')

        # When we're back at depth 0 and have content, check if next line
        # starts a new selector or comment
        if depth == 0 and current_block:
            # Check if the block is "complete" (has at least one closing brace
            # or is just comments/whitespace)
            has_brace = any('}' in l for l in current_block)
            if has_brace:
                blocks.append(current_block)
                current_block = []

    # Don't lose trailing content
    if current_block:
        blocks.append(current_block)

    return blocks


def merge_small_blocks(blocks):
    """
    Merge consecutive blocks with the same classification.
    Also merge unclassified blocks with neighbors.
    """
    if not blocks:
        return []

    classified = []
    for block in blocks:
        feature = classify_block(block)
        classified.append((feature, block))

    # Forward-fill None classifications
    for i in range(len(classified)):
        if classified[i][0] is None:
            # Look ahead for next classified block
            for j in range(i + 1, min(i + 5, len(classified))):
                if classified[j][0] is not None:
                    classified[i] = (classified[j][0], classified[i][1])
                    break
            # If still None, look back
            if classified[i][0] is None:
                for j in range(i - 1, max(i - 5, -1), -1):
                    if classified[j][0] is not None:
                        classified[i] = (classified[j][0], classified[i][1])
                        break

    # Anything still unclassified goes to ui-common
    classified = [
        (f if f is not None else '55-ui-common', block)
        for f, block in classified
    ]

    return classified


def main():
    # Read original CSS
    with open(CSS_PATH, 'r', encoding='utf-8') as f:
        content = f.read()

    lines = content.split('\n')
    total_original = len(lines)
    print(f"Read {total_original} lines from HomePage.css")

    # Parse into blocks
    blocks = parse_css_blocks(lines)
    print(f"Parsed {len(blocks)} top-level CSS blocks")

    # Classify and merge
    classified = merge_small_blocks(blocks)

    # Group by feature, preserving order of first appearance
    feature_order = []
    feature_blocks = {}
    for feature, block in classified:
        if feature not in feature_blocks:
            feature_order.append(feature)
            feature_blocks[feature] = []
        feature_blocks[feature].append(block)

    print(f"\nSplit into {len(feature_order)} feature files:")

    # Ensure styles directory exists
    os.makedirs(STYLES_DIR, exist_ok=True)

    # Write each feature file
    total_written = 0
    import_lines = []

    for feature in feature_order:
        blocks_for_feature = feature_blocks[feature]
        all_lines = []
        for block in blocks_for_feature:
            all_lines.extend(block)
            # Add a blank line between blocks
            if all_lines and all_lines[-1].strip():
                all_lines.append('')

        # Remove trailing blank lines
        while all_lines and not all_lines[-1].strip():
            all_lines.pop()

        file_content = '\n'.join(all_lines) + '\n'
        file_name = f"{feature}.css"
        file_path = os.path.join(STYLES_DIR, file_name)

        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(file_content)

        line_count = len(all_lines)
        total_written += line_count
        import_lines.append(f"@import './styles/{file_name}';")
        print(f"  {file_name}: {line_count} lines")

    # Write new HomePage.css with imports
    new_homepage = '/* HomePage.css — auto-split into feature modules */\n'
    new_homepage += '/* Do not add rules here. Edit the corresponding file in styles/ */\n\n'
    new_homepage += '\n'.join(import_lines) + '\n'

    with open(CSS_PATH, 'w', encoding='utf-8') as f:
        f.write(new_homepage)

    print(f"\n✓ Total lines written: {total_written}")
    print(f"✓ Original lines: {total_original}")
    print(f"✓ HomePage.css rewritten with {len(import_lines)} @import statements")

    # Verify no content lost
    # Re-read all split files
    total_check = 0
    for feature in feature_order:
        file_path = os.path.join(STYLES_DIR, f"{feature}.css")
        with open(file_path, 'r', encoding='utf-8') as f:
            total_check += len(f.read().split('\n'))
    print(f"✓ Verification: {total_check} lines across all split files")


if __name__ == '__main__':
    main()
