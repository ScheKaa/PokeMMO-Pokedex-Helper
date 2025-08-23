import {catchRates } from './pokemon.js';
import { BALLS_CATCHRATE, STATUSES_CATCHRATE, calculateCatchRate } from './useCatchRate.js';

const getNestBallRate = (pokemonLevel) => {
    if (pokemonLevel >= 1 && pokemonLevel <= 16) return 4.00;
    if (pokemonLevel === 17) return 3.80;
    if (pokemonLevel === 18) return 3.60;
    if (pokemonLevel === 19) return 3.40;
    if (pokemonLevel === 20) return 3.20;
    if (pokemonLevel === 21) return 3.00;
    if (pokemonLevel === 22) return 2.80;
    if (pokemonLevel === 23) return 2.60;
    if (pokemonLevel === 24) return 2.40;
    if (pokemonLevel === 25) return 2.20;
    if (pokemonLevel === 26) return 2.00;
    return 1.00;
};

export const calculatePokemonCatchProbability = (pokemonData, hpPercent, ballName, statusName, pokemonLevel = null, locationType = null) => {
    let pkmnRate = null;
    let catchRateProbabilities = null;

    if (!pokemonData) {
        console.warn(`Pokémon data not found.`);
        return null;
    }

    const catchRateData = catchRates.find(c => c.id === pokemonData.id);
    if (catchRateData) {
        pkmnRate = catchRateData.rate;
    } else {
        console.warn(`Catch rate data not found for Pokémon ID ${pokemonData.id}.`);
        return null;
    }

    const selectedBall = BALLS_CATCHRATE.find(ball => ball.name === ballName);
    const selectedStatus = STATUSES_CATCHRATE.find(status => status.name === statusName);

    if (!selectedBall) {
        console.warn(`Poké Ball "${ballName}" not found.`);
        return null;
    }
    if (!selectedStatus) {
        console.warn(`Status "${statusName}" not found.`);
        return null;
    }

    let effectiveBallRate = selectedBall.rate;

    if (locationType === 'Safari Zone') {
        if (ballName !== 'Safari Ball' || hpPercent !== 100 || statusName !== null) {
            return null;
        }
    }

    if (ballName === 'Net Ball') {
        const isWaterOrBug = pokemonData.types.includes('WATER') || pokemonData.types.includes('BUG');
        if (!isWaterOrBug) {
            effectiveBallRate = 1;
        }
    }

    if (ballName === 'Nest Ball' && pokemonLevel !== null) {
        effectiveBallRate = getNestBallRate(pokemonLevel);
    }

    // to reduce calculations, might change that in the future
    const max_hp = 100; 
    if (pkmnRate !== null) {
        const current_hp = (max_hp * hpPercent) / 100;

        const result = calculateCatchRate(
            pkmnRate,
            max_hp,
            current_hp,
            effectiveBallRate,
            selectedStatus
        );

        catchRateProbabilities = result?.probabilities ?? null;
    }

    return catchRateProbabilities;
};
