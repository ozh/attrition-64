export default {
    title: 'BUSINESS AS USUAL',
    author: 'ozh',
    background: '#001a00',
    ballColor: '#22aa22',

    types: {
        // Body contour.
        '#': { color: '#3a2616', hp: 1, points: 10, explode: 1, chain: false },

        // Black bands, head, and sting.
        k: { color: '#3d2c1a', hp: 2, points: 30, explode: 1, chain: false,
            damage: ['#3d2c1a', '#241a0f'] },

        // Yellow bands.
        y: { color: '#f8c22d', hp: 2, points: 20, explode: 1, chain: false,
            damage: ['#f8c22d', '#c99418'] },

        // Fuzzy thorax.
        f: { color: '#d9973c', hp: 2, points: 30, explode: 1, chain: false,
            damage: ['#d9973c', '#a86e26'] },

        // Compound eyes.
        e: { color: '#7a5a3a', hp: 2, points: 40, explode: 1, chain: false,
            damage: ['#7a5a3a', '#513a24'] },

        // Wings: thin and brittle, they go first.
        w: { color: '#d9edf7', hp: 1, points: 10, explode: 1, chain: false },
        W: { color: '#8fb4c9', hp: 1, points: 10, explode: 1, chain: false },

        // Legs and antennae.
        l: { color: '#6b4a28', hp: 1, points: 20, explode: 1, chain: false },

        '*': { color: '#ffd23f', hp: 1, points: 50, explode: 4 },
        '+': { color: '#ffffff', hp: 1, points: 20, explode: 1, chain: false, powerup: 0.75 },
    },

    grid: [
        '................................................................',
        '................................................................',
        '......................ll................ll......................',
        '........................ll............ll........................',
        '.........................ll..........ll.........................',
        '..........................l..........l..........................',
        '...........................l########l...........................',
        '..........................##lkkkkkkl##..........................',
        '.........................##kkkkkkkkkk##.........................',
        '.........................#keekkkkkkeek#.........................',
        '.........................#eeeekkkkeeee#.........................',
        '.........................#eeeekkkkeeee#.........................',
        '.........................#eeeekkkkeeee#.........................',
        '.........................#keekkkkkkeek#.........................',
        '...............WWWWWW....##kkkkkkkkkk##....WWWWWW...............',
        '...........WWwwwwwwwllWWW.###kkkkkk###.WWWllwwwwwwwWW...........',
        '........WWwwwwwwwwww+wllW###ffffffff###Wllw+wwwwwwwwwwWW........',
        '.......WwwwwwwwwwwwwwwwwllffffffffffffllwwwwwwwwwwwwwwwwW.......',
        '......Wwwwwwwwwwwwwwwwww#ffffffffffffff#wwwwwwwwwwwwwwwwwW......',
        '.....WWwwwwwwwwwwwwwwwwW#ffffffffffffff#WwwwwwwwwwwwwwwwwWW.....',
        '.....WWwwwwwwwwwwwwwwwW##ffffff**ffffff##WwwwwwwwwwwwwwwwWW.....',
        '......WWwwwwwwwwwwwWW.Wlfffffff**ffffffflW.WWwwwwwwwwwwwWW......',
        '........WWWWWWWWWWlllll##ffffffffffffff##lllllWWWWWWWWWW........',
        '..................Wwwwww#ffffffffffffff#wwwwwW..................',
        '.................Wwwwwww#ffffffffffffff#wwwwwwW.................',
        '................Wwwwwwww##ffffffffffff##wwwwwwwW................',
        '...............Ww+wwwwwWll#yffffffffy#llWwwwww+wW...............',
        '...............wwwwwwwl.##yyyyykkyyyyy##.lwwwwwww...............',
        '..............WwwwwllW.##kkkkkkkkkkkkkk##.WllwwwwW..............',
        '..............WwwwlW...#kkkkkkkkkkkkkkkk#...WlwwwW..............',
        '...............WWW....+#kyyyyyyyyyyyyyyk#+....WWW...............',
        '......................#yyyyyyyyyyyyyyyyyy#......................',
        '......................#yyyyyyyyyyyyyyyyyy#......................',
        '......................#yyy+kkkkkkkkkk+yyy#......................',
        '......................#kkkkkkkkkkkkkkkkkk#......................',
        '.....................##kkkkkkkkkkkkkkkkkk##.....................',
        '.....................#kyyyyyyyy**yyyyyyyyk#.....................',
        '.....................#yyyyyyyyyyyyyyyyyyyy#.....................',
        '.....................#yyyyyyyyyyyyyyyyyyyy#.....................',
        '.....................##ykkkkkkkkkkkkkkkky##.....................',
        '......................#kkkkkkkkkkkkkkkkkk#......................',
        '......................#kk+kyyyyyyyyyyk+kk#......................',
        '......................#yyyyyyyyyyyyyyyyyy#......................',
        '......................#yyyyyyyyyyyyyyyyyy#......................',
        '......................##yyyykkkkkkkkyyyy##......................',
        '.......................#kkkkkkk**kkkkkkk#.......................',
        '.......................#kkkkkkkkkkkkkkkk#.......................',
        '.......................##yyyyyyyyyyyyyy##.......................',
        '........................#yyyyyyyyyyyyyy#........................',
        '........................##yyyyyyyyyyyy##........................',
        '.........................##kk+kkkk+kk##.........................',
        '..........................#kkkkkkkkkk#..........................',
        '..........................##kyyyyyyk##..........................',
        '...........................##yyyyyy##...........................',
        '............................##ykyy##............................',
        '.............................##kk##.............................',
        '..............................#k##..............................',
        '..............................#k#...............................',
        '..............................###...............................',
        '................................................................',
        '................................................................',
        '................................................................',
        '................................................................',
        '................................................................',
    ],


    paddle: {
        colors: { c: '#3a3f4d', s: '#b9b6c4', r: '#3a3f4d', g: '#5a88cc', w: '#9c5344', k: '#22222a' },
        grid: [
            '..sss............',
            '.ccs.............',
            '.cc...rg..rg..rg',
            '.cc..rrg.rrg.rrg',
            'rccrrrrgrrrgrrrg',
            'wgwwwgwwwgwwgwww',
            'wgwwwgwwwgwwgwww',
            'kkkkkkkkkkkkkkkk',
        ],
    },
};

