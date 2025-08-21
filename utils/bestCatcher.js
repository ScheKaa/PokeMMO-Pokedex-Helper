import { calculatePokemonCatchProbability } from './CatchCalculator.js';
import { BALLS_CATCHRATE } from './useCatchRate.js';

const safariZoneLocations = ['safari zone', 'great marsh'];

const SUPPORTED_POKE_BALLS = [
    'Poke Ball', 'Net Ball', 'Nest Ball', 'Quick Ball', 'Great Ball', 'Ultra Ball', 'Dusk Ball', 'Safari Ball'
].map(ballName => {
    const foundBall = BALLS_CATCHRATE.find(b => b.name === ballName);
    return foundBall ? { name: foundBall.name, price: foundBall.price } : null;
}).filter(Boolean);

const calculateCatchProbabilities = (pokemon, ballName) => {
    const pokemonLevel = pokemon.encounter?.max_level || 1;
    const locationType = pokemon.encounter?.type;
    const locationName = pokemon.encounter?.location;

    const isSafariZone = locationName && safariZoneLocations.some(name => locationName.toLowerCase().includes(name));

    if (ballName === 'Safari Ball') {
        return isSafariZone ? {
            fullHp: calculatePokemonCatchProbability(pokemon, 100, ballName, null, pokemonLevel, locationType, locationName),
            oneHp: null,
            fullHpSleep: null,
            oneHpSleep: null
        } : null;
    }

    if (isSafariZone) {
        return null;
    }

    const oneHpPercentage = 1;
    
    return {
        fullHp: calculatePokemonCatchProbability(pokemon, 100, ballName, null, pokemonLevel, locationType, locationName),
        oneHp: calculatePokemonCatchProbability(pokemon, oneHpPercentage, ballName, null, pokemonLevel, locationType, locationName),
        fullHpSleep: calculatePokemonCatchProbability(pokemon, 100, ballName, 'Sleep', pokemonLevel, locationType, locationName),
        oneHpSleep: calculatePokemonCatchProbability(pokemon, oneHpPercentage, ballName, 'Sleep', pokemonLevel, locationType, locationName)
    };
};

export const getBestCatchingProbabilities = (pokemonList) => {
    return pokemonList.map(pokemon => {
        if (!pokemon.encounter || pokemon.encounter.max_level === undefined || pokemon.encounter.type === undefined || pokemon.encounter.location === undefined) {
            console.warn(`Skipping ${pokemon.name} (ID: ${pokemon.id}) - Missing encounter level, type, or location name data for catch calculation.`);
            return null;
        }

        const probabilities = {};
        const isSafariZone = pokemon.encounter.location && safariZoneLocations.some(name => pokemon.encounter.location.toLowerCase().includes(name));
        
        let relevantBalls = SUPPORTED_POKE_BALLS;
        if (isSafariZone) {
            relevantBalls = SUPPORTED_POKE_BALLS.filter(ball => ball.name === 'Safari Ball');
        } else {
            relevantBalls = SUPPORTED_POKE_BALLS.filter(ball => ball.name !== 'Safari Ball');
        }

        relevantBalls.forEach(ball => {
            const calculated = calculateCatchProbabilities(pokemon, ball.name);
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

const processBallEstimates = (pokemonResult, adderFunction) => {
    const results = [];
    
    SUPPORTED_POKE_BALLS.forEach(ball => {
        const ballProbs = pokemonResult.probabilities[ball.name];
        if (!ballProbs) return;

        adderFunction(results, ball.name, ball.price, 'Full HP', ballProbs.fullHp, 1, ball.name === 'Quick Ball', ball.name === 'Safari Ball');
        
        if (ball.name !== 'Quick Ball' && ball.name !== 'Safari Ball') {
            adderFunction(results, ball.name, ball.price, '1 HP', ballProbs.oneHp, 2);
            adderFunction(results, ball.name, ball.price, 'Full HP + Sleep', ballProbs.fullHpSleep, 2);
            adderFunction(results, ball.name, ball.price, '1 HP + Sleep', ballProbs.oneHpSleep, 3);
        }
    });

    return results;
};

export const getTop4CostEfficientBalls = (calculatedProbabilities) => {
    return calculatedProbabilities.map(pokemonResult => {
        const scores = processBallEstimates(pokemonResult, addCostEfficiency);
        return {
            pokemonId: pokemonResult.pokemonId,
            pokemonName: pokemonResult.pokemonName,
            encounterLocation: pokemonResult.encounterLocation,
            top4CostEfficientBalls: scores.sort((a, b) => a.expectedCost - b.expectedCost).slice(0, 4)
        };
    });
};

export const getFastestCatchEstimates = (calculatedProbabilities) => {
    return calculatedProbabilities.map(pokemonResult => {
        const estimates = processBallEstimates(pokemonResult, addCatchEstimate);
        return {
            pokemonId: pokemonResult.pokemonId,
            pokemonName: pokemonResult.pokemonName,
            encounterLocation: pokemonResult.encounterLocation,
            fastestCatchEstimates: estimates.sort((a, b) =>
                a.sortTurns - b.sortTurns ||
                b.sortProbability - a.sortProbability ||
                a.expectedCost - b.expectedCost
            ).slice(0, 4)
        };
    });
};