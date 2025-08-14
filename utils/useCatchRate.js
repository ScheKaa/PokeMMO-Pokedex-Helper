import { catchRates } from './pokemon.js';
export const BALLS = [
    {
        name: 'pokeball',
        rate: 1,
        status: true,
        health: true
    },
    {
        name: 'megaball',
        rate: 1.5,
        status: true,
        health: true
    },
    {
        name: 'ultraball',
        rate: 2,
        status: true,
        health: true
    },
    {
        name: 'bisball',
        rate: 2.5,
        status: true,
        health: true
    },
    {
        name: 'veloxball',
        rate: 5,
        status: true,
        health: false
    }
];

export const BALLS_CATCHRATE = [
    {
        name: 'Poke Ball',
        price: 200,
        rate: 1,
        status: true,
        health: true
    },
    {
        name: 'Great Ball',
        price: 600,
        rate: 1.5,
        status: true,
        health: true
    },
    {
        name: 'Ultra Ball',
        price: 1200, 
        rate: 2,
        status: true,
        health: true
    },
    {
        name: 'Heal Ball',
        price: 300, 
        rate: 1.25,
        status: true,
        health: true
    },
    {
        name: 'Net Ball',
        price: 1350, 
        rate: 3.5, 
        status: true,
        health: true
    },
    {
        name: 'Nest Ball',
        price: 1200, 
        rate: 1,
        status: true,
        health: true
    },
    {
        name: 'Dusk Ball',
        price: 1350, 
        rate: 2.5,
        status: true,
        health: true
    },
    {
        name: 'Quick Ball',
        price: 1200, 
        rate: 5,
        status: true,
        health: true
    },
    {
        name: 'Timer Ball',
        price: 1000, 
        rate: 4,
        status: true,
        health: true
    },
    {
        name: 'Repeat Ball',
        price: 1000, 
        rate: 2.5,
        status: true,
        health: true
    },
    {
        name: 'Luxury Ball',
        price: 3000, 
        rate: 2,
        status: true,
        health: true
    },
    {
        name: 'Safari Ball',
        price: 16.7, 
        rate: 1.5,
        status: true,
        health: true
    }
];

export const STATUSES_CATCHRATE = [
    {
        name: null,
        rate: 1
    },
    {
        name: 'Sleep',
        rate: 2
    },
    {
        name: 'Freeze',
        rate: 2
    },
    {
        name: 'Paralysis',
        rate: 1.5
    },
];

export const calculateCatchRate = (pkmn_rate, max_hp, current_hp, effectiveBallRate, status) => {
    const x = (((max_hp * 3 - current_hp * 2) * pkmn_rate * effectiveBallRate) / (max_hp * 3)) * status.rate;

    if (x >= 255) return { probabilities: 100 };

    const y = (65536 / (Math.sqrt(Math.sqrt(255 / x))));
    const z = (y / 65536) * (y / 65536) * (y / 65536) * (y / 65536) * 100;
    
    return { probabilities: Math.round(z * 10) / 10 };
};

export const getCatchRates = (dex_id, max_hp) => {
    const results = [];

    const rateObj = catchRates.find(({ id }) => id === dex_id);
    const pkmn_rate = typeof rateObj !== "undefined" ? rateObj.rate : 0;

    BALLS.forEach(ball => {
        STATUSES_CATCHRATE.forEach(status => {
            if (!ball.status && status.name !== null) {
                return;
            }
            
            const effectiveBallRate = ball.rate;

            results.push(calculateCatchRate(pkmn_rate, max_hp, max_hp, effectiveBallRate, status));
            
            if (ball.health) {
                results.push(calculateCatchRate(pkmn_rate, max_hp, 1, effectiveBallRate, status));
            }
        });
    });

    return results;
};
