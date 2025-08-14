import { calculatePokemonCatchProbability } from './CatchCalculator.js';
import { BALLS_CATCHRATE } from './useCatchRate.js';

const SUPPORTED_POKE_BALLS = [
    'Poke Ball', 'Net Ball', 'Nest Ball', 'Quick Ball', 'Great Ball', 'Ultra Ball', 'Dusk Ball', 'Safari Ball'
].map(ballName => {
    const foundBall = BALLS_CATCHRATE.find(b => b.name === ballName);
    return foundBall ? { name: foundBall.name, price: foundBall.price } : null;
}).filter(Boolean);

const calculateProbabilities = (pokemon, ballName) => {
    if (!pokemon.stats?.hp) {
        console.warn(`Skipping probability calculation for ${pokemon.name} - Invalid HP.`);
        return null;
    }

    const pokemonLevel = pokemon.encounter?.max_level || 1;
    const locationType = pokemon.encounter?.type;
    const locationName = pokemon.encounter?.location;

    const isSafariZone = locationName && locationName.toLowerCase().includes('safari zone');

    const oneHpPercentage = (1 / pokemon.stats.hp) * 100;

    if (ballName === 'Safari Ball') {
        if (isSafariZone) {
            return {
                fullHp: calculatePokemonCatchProbability(pokemon, 100, ballName, null, pokemonLevel, locationType, locationName),
                oneHp: null,
                fullHpSleep: null,
                oneHpSleep: null
            };
        } else {
            return null;
        }
    }

    if (isSafariZone) {
        return null;
    }

    return {
        fullHp: calculatePokemonCatchProbability(pokemon, 100, ballName, null, pokemonLevel, locationType, locationName),
        oneHp: calculatePokemonCatchProbability(pokemon, oneHpPercentage, ballName, null, pokemonLevel, locationType, locationName),
        fullHpSleep: calculatePokemonCatchProbability(pokemon, 100, ballName, 'Sleep', pokemonLevel, locationType, locationName),
        oneHpSleep: calculatePokemonCatchProbability(pokemon, oneHpPercentage, ballName, 'Sleep', pokemonLevel, locationType, locationName)
    };
};

export const getBestCatchingProbabilities = (pokemonList) => {
    return pokemonList.map(pokemon => {
        if (!pokemon.stats?.hp) {
            console.warn(`Skipping ${pokemon.name} (ID: ${pokemon.id}) - Invalid HP.`);
            return null;
        }
        if (!pokemon.encounter || pokemon.encounter.max_level === undefined || pokemon.encounter.type === undefined || pokemon.encounter.location === undefined) {
            console.warn(`Skipping ${pokemon.name} (ID: ${pokemon.id}) - Missing encounter level, type, or location name data for catch calculation.`);
            return null;
        }

        const probabilities = {};
        const isSafariZoneLocation = pokemon.encounter.location && pokemon.encounter.location.toLowerCase().includes('safari zone');

        let relevantBalls = SUPPORTED_POKE_BALLS;
        if (isSafariZoneLocation) {
            relevantBalls = SUPPORTED_POKE_BALLS.filter(ball => ball.name === 'Safari Ball');
        } else {
            relevantBalls = SUPPORTED_POKE_BALLS.filter(ball => ball.name !== 'Safari Ball');
        }

        relevantBalls.forEach(ball => {
            const calculated = calculateProbabilities(pokemon, ball.name);
            if (calculated) {
                probabilities[ball.name] = calculated;
            }
        });

        return {
            pokemonId: pokemon.id,
            pokemonName: pokemon.name,
            encounterLocation: pokemon.encounter.location,
            probabilities
        };
    }).filter(Boolean);
};

const addCostEfficiency = (scores, ballName, ballPrice, condition, probability) => {
    if (probability !== null && probability > 0) {
        scores.push({
            ballName,
            condition,
            expectedCost: ballPrice / (probability / 100),
            probability,
            price: ballPrice
        });
    }
};

export const getTop4CostEfficientBalls = (calculatedProbabilities) => {
    return calculatedProbabilities.map(pokemonResult => {
        const scores = [];

        SUPPORTED_POKE_BALLS.forEach(ball => {
            const ballProbs = pokemonResult.probabilities[ball.name];
            if (!ballProbs) return;

            addCostEfficiency(scores, ball.name, ball.price, 'Full HP', ballProbs.fullHp);

            if (ball.name !== 'Quick Ball' && ball.name !== 'Safari Ball') {
                addCostEfficiency(scores, ball.name, ball.price, '1 HP', ballProbs.oneHp);
                addCostEfficiency(scores, ball.name, ball.price, 'Full HP + Sleep', ballProbs.fullHpSleep);
                addCostEfficiency(scores, ball.name, ball.price, '1 HP + Sleep', ballProbs.oneHpSleep);
            }
        });

        return {
            pokemonId: pokemonResult.pokemonId,
            pokemonName: pokemonResult.pokemonName,
            encounterLocation: pokemonResult.encounterLocation,
            top4CostEfficientBalls: scores.sort((a, b) => a.expectedCost - b.expectedCost).slice(0, 8)
        };
    });
};

const addCatchEstimate = (estimates, ballName, ballPrice, condition, probability, baseTurns, isQuickBall = false, isSafariBall = false) => {
    if (probability === null || (isQuickBall && probability !== 100)) return;

    const expectedCost = ballPrice / (probability / 100);
    let turns, sortTurns;

    if (probability === 100) {
        turns = sortTurns = baseTurns;
    } else {
        const expectedThrows = 100 / probability;
        turns = `${baseTurns}-${baseTurns - 1 + Math.ceil(expectedThrows)}`;
        sortTurns = baseTurns - 1 + expectedThrows;
    }

    estimates.push({
        ballName,
        condition,
        turns,
        probability,
        expectedCost,
        sortTurns,
        sortProbability: probability
    });
};

export const getFastestCatchEstimates = (calculatedProbabilities) => {
    return calculatedProbabilities.map(pokemonResult => {
        const estimates = [];

        SUPPORTED_POKE_BALLS.forEach(ball => {
            const ballProbs = pokemonResult.probabilities[ball.name];
            if (!ballProbs) return;

            const isQuick = ball.name === 'Quick Ball';
            const isSafari = ball.name === 'Safari Ball';
            addCatchEstimate(estimates, ball.name, ball.price, 'Full HP', ballProbs.fullHp, 1, isQuick, isSafari);

            if (!isQuick && !isSafari) {
                addCatchEstimate(estimates, ball.name, ball.price, '1 HP', ballProbs.oneHp, 2);
                addCatchEstimate(estimates, ball.name, ball.price, 'Full HP + Sleep', ballProbs.fullHpSleep, 2);
                addCatchEstimate(estimates, ball.name, ball.price, '1 HP + Sleep', ballProbs.oneHpSleep, 3);
            }
        });

        return {
            pokemonId: pokemonResult.pokemonId,
            pokemonName: pokemonResult.pokemonName,
            encounterLocation: pokemonResult.encounterLocation,
            fastestCatchEstimates: estimates.sort((a, b) =>
                a.sortTurns - b.sortTurns ||
                b.sortProbability - a.sortProbability ||
                a.expectedCost - b.expectedCost
            ).slice(0, 8)
        };
    });
};
