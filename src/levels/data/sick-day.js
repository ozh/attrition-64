export default {
    title: 'SICK DAY',
    author: 'ozh',
    background: '#002',
    ballColor: '#00ff00',

    types: {
        // Silhouette outline, and the separation between the body and the cape.
        '#': { color: '#241826', hp: 1, points: 10, explode: 1, chain: false },

        // Blue suit.
        b: { color: '#2f5fc4', hp: 2, points: 20, explode: 1, chain: false,
            damage: ['#2f5fc4', '#20428c'] },

        // Red cape, trunks and boots.
        r: { color: '#d1332f', hp: 2, points: 20, explode: 1, chain: false,
            damage: ['#d1332f', '#96201f'] },

        // Cape folds, in shadow.
        R: { color: '#8e1f22', hp: 2, points: 30, explode: 1, chain: false,
            damage: ['#8e1f22', '#611416'] },

        // Belt.
        y: { color: '#f2c02e', hp: 2, points: 40, explode: 1, chain: false,
            damage: ['#f2c02e', '#bb8f18'] },

        // Face and fists.
        s: { color: '#f0bf95', hp: 1, points: 20, explode: 1, chain: false },

        // Hair and eyes.
        h: { color: '#2b1d16', hp: 1, points: 30, explode: 1, chain: false },

        '*': { color: '#ffd23f', hp: 1, points: 50, explode: 4 },
        '+': { color: '#ffffff', hp: 1, points: 20, explode: 1, chain: false, powerup: 0.75 },
    },

    grid: [
        '................................................................',
        '................................................................',
        '................................................................',
        '................................................................',
        '................................................................',
        '................................................................',
        '............................................######..............',
        '...........................................##ssss##.............',
        '...........................................#ssssss#.............',
        '...........................................#ss+sss#.............',
        '..........................................##ssssss#.............',
        '..........................................#bsssss##.............',
        '.............................#######.....##bbsss##..............',
        '............................##hhhhh##...##bbbbbb#...............',
        '...........................##hhhhhhh##..#bbbbbb##...............',
        '...........................#hhhhhhhhh#.##bbbbb##................',
        '...........................#sssssssss###bbbbbb#.................',
        '...........................#ssss+ssss##bbbbbb##.................',
        '...........................#sshssshss##bbbbbb#..................',
        '...........................#sssssssss#bbbbbb##..................',
        '..........................##sssssssss#bbbbbb#...................',
        '.........................##bbsssssssbbbbbbb##...................',
        '.........................#bbbbsssssbbbbbbbb#....................',
        '........................##bbbbsssssbbbbbbb##....................',
        '.......................##bbbbbsssssbbbbbbb#.....................',
        '....................####bbbbbbbsssbbbbbbb####...................',
        '...................##r##bbbbbbbbbbbbbbbbb#rr##..................',
        '.................###r##bb+bbbbbbbbbbbbb+##rrr###................',
        '...............###rrr#bbbbbbbbbbbbbbbbb##rrrrrr##...............',
        '...............#rrrr##bbbbbbbrrrrrrrbbb#RRrrrrrr##..............',
        '..............##rrrR#bbbbbbbrrr**rrrrbb#rrRrrrrrr##.............',
        '..............#rrrR##bbbbbbrrrr**rrrrbb#rrrRRrrrrr#.............',
        '.............##rRRr#bbbbbbbrrrrrrrrrrr##RrrrRRrrrr##............',
        '.............#RRrrr#bbbbbbyyyyyyyyyyyy#rRRrrrrRRrrr#............',
        '............##r+rr##bbbbb#yyyyyyyyyyyy#RrRRrrrrRR+r##...........',
        '............#rrrrr#bbbbb##rrrrrrrrrrrr#RRrRrrrrrrRrr#...........',
        '...........##rrrrr#b*bbb##brrrrrrrrrrr#rRrrR*rrrrrRR##..........',
        '..........##rrrrr##bbbbb##brrrrrrrrrrr#rrRrrRrrrrrrrR#..........',
        '..........#rrrrrR#bssbb###brrrrrrrrrrb##rRrrrRrrrrrrr#..........',
        '..........##rrrR##ssssb###brrrrrrrrrrbb#rrRrrrRrrrrrr#..........',
        '...........#rrRr#ssssss#+bbbrrrrrrrrrbb#+rRRrrRRrrrrr#..........',
        '...........##Rrr##ssss###bbbrrrrrrrrbbb#rrrRrrrRRrrr##..........',
        '............#rrrr#ssss#r#bbbbrrrrrrbbbb##rrrRrrrRrrr#...........',
        '............#rrrr*#######bbbbbbb#bbbbbbb#rrrR##*rRrr#...........',
        '............##rrr#..#rr#bbbbbbb##bbbbbbb#rrr####rrR##...........',
        '.............+rr##..#rr#bbbbbbb##bbbbbbb#rrr#..##rr+............',
        '.............####...##r#bbbbb+####b+bbbb#rr##...####............',
        '.....................#r#bbbbbb#rR#bbbbbb#rr#....................',
        '.....................###bbbbbb#rR#bbbbbb####....................',
        '......................#bbbbbb###r##bbbbbb#......................',
        '......................#brrrbb#.####bbrrrb#......................',
        '......................#rrrrrb#....#brrrrr#......................',
        '......................#rrrrrr#....#rrrrrr#......................',
        '......................#rrrrrr#....#rrrrrr#......................',
        '......................#rrrrr##....##rrrrr#......................',
        '.....................##rr+rr#......#rr+rr##.....................',
        '.....................#rrrrrr#......#rrrrrr#.....................',
        '.....................#rrrrrr#......#rrrrrr#.....................',
        '.....................#rrrrr##......##rrrrr#.....................',
        '.....................##rrrr#........#rrrr##.....................',
        '......................##r###........###r##......................',
        '.......................###............###.......................',
        '................................................................',
        '................................................................',
    ],

    paddle: {
        colors: { g: '#00ff00', w: '#aaffaa', b: '#1a5a1a' },
        grid: [
            '...bbbbbbbbb...........',
            '..bgggggggggb...........',
            '.bgbgggggggbgb..........',
            'bwwgbbbbbbbwggb.........',
            '.bwbwwwwgggbgb..........',
            '..bwwwwwwwwwb...........',
            '...bbbbbbbbb............',
            '........................',
        ],
    },
};

