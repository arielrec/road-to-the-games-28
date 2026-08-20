"""
Sport -> discipline hierarchy.

The source lists 42 "sports", but six of them are sailing classes and five are cycling
disciplines. Someone following sailing had to follow six separate entries, and the sports
grid showed six near-identical tiles. Grouping them gives 24 real sports with disciplines
nested underneath — following the parent follows every class.

`logo` names the child whose pictogram represents the parent.
"""
PARENTS = {
    'Aquatics': {
        'he': 'ספורט מים', 'logo': 'swimming',
        'children': ['Swimming', 'Diving', 'Artistic Swimming', 'Marathon Swimming', 'Water Polo'],
    },
    'Sailing': {
        'he': 'שייט', 'logo': 'sailing',
        'children': ['Sailing 470', 'Sailing 49er', 'Sailing Formula Kite', 'Sailing IQFoil',
                     'Sailing Laser Class', 'Sailing Nacra 17'],
    },
    'Cycling': {
        'he': 'אופניים', 'logo': 'road_cycling',
        'children': ['Road Cycling', 'Track Cycling', 'Cycling Mountain Bike',
                     'Cycling BMX Racing', 'Cycling BMX Freestyle'],
    },
    'Gymnastics': {
        'he': 'התעמלות', 'logo': 'artistic_gymnastics',
        'children': ['Artistic Gymnastics', 'Rhythmic Gymnastics', 'Trampoline'],
    },
    'Canoe': {
        'he': 'קאנו', 'logo': 'canoe_sprint',
        'children': ['Canoe Slalom', 'Canoe Sprint'],
    },
    'Basketball': {
        'he': 'כדורסל', 'logo': 'basketball',
        'children': ['Basketball', 'Basketball 3x3'],
    },
    'Volleyball': {
        'he': 'כדורעף', 'logo': 'volleyball',
        'children': ['Volleyball', 'Beach Volleyball'],
    },
}

# Short discipline labels for use inside a parent, where the parent name is redundant.
DISCIPLINE_LABEL = {
    'Sailing 470': ('470', '470'), 'Sailing 49er': ('49er', '49er'),
    'Sailing Formula Kite': ('Formula Kite', 'גלשן מצנח'), 'Sailing IQFoil': ('iQFOiL', 'iQFOiL'),
    'Sailing Laser Class': ('ILCA / Laser', 'לייזר'), 'Sailing Nacra 17': ('Nacra 17', 'נקרה 17'),
    'Road Cycling': ('Road', 'כביש'), 'Track Cycling': ('Track', 'מסלול'),
    'Cycling Mountain Bike': ('Mountain Bike', 'אופני הרים'),
    'Cycling BMX Racing': ('BMX Racing', 'BMX מירוץ'),
    'Cycling BMX Freestyle': ('BMX Freestyle', 'BMX סגנון חופשי'),
    'Canoe Slalom': ('Slalom', 'סללום'), 'Canoe Sprint': ('Sprint', 'ספרינט'),
    'Basketball 3x3': ('3x3', '3 נגד 3'), 'Beach Volleyball': ('Beach', 'חופים'),
    'Artistic Gymnastics': ('Artistic', 'מכשירים'), 'Rhythmic Gymnastics': ('Rhythmic', 'אמנותית'),
    'Trampoline': ('Trampoline', 'טרמפולינה'),
    'Swimming': ('Swimming', 'שחייה'), 'Diving': ('Diving', 'קפיצה למים'),
    'Artistic Swimming': ('Artistic Swimming', 'שחייה אמנותית'),
    'Marathon Swimming': ('Marathon', 'מרתון'), 'Water Polo': ('Water Polo', 'כדורמים'),
    'Basketball': ('5x5', '5 נגד 5'), 'Volleyball': ('Indoor', 'אולם'), 'Sailing': ('Sailing', 'שייט'),
}

CHILD_TO_PARENT = {c: p for p, v in PARENTS.items() for c in v['children']}

# Logo file stem for sports that stay top-level (source name -> asset name)
STANDALONE_LOGO = {
    'Archery': 'archery', 'Athletics': 'athletics', 'Badminton': 'badminton',
    'Fencing': 'fencing', 'Field Hockey': 'field_hockey', 'Flag Football': 'flag_football',
    'Football': 'football', 'Handball': 'handball', 'Judo': 'judo', 'Lacrosse': 'lacrosse',
    'Rowing': 'rowing', 'Rugby Sevens': 'rugby_seven', 'Sport Climbing': 'sport_climbing',
    'Surfing': 'surfing', 'Taekwondo': 'taekwondo', 'Tennis': 'tennis', 'Wrestling': 'wrestling',
}
