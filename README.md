# PokeMMO Pokedex Helper

This project is a Pokedex Helper designed for PokeMMO, providing tools and utilities to enhance the gameplay experience. It includes features for Pokedex management, catch rate calculations, and recommendations for the best catchers.

## Features

- **Pokedex Management:** Keep track of your Ingame Pokedex.
- **Pokedex Filtering:** Various filter option, e.g. pheno 'Special Only' Pokemon.
- **Profile Managment:** Create different profiles for different Accounts
- **Browser Stored:** Progress is browser stored, you can export/import your progress in case you need to switch your browser,
  or edit the .json file manually.
- **Best Catching Spot Recommendations:** Identify optimal location for catching Pokemon, including current season and daytime.
- **Catch Rate Calculator:** Calculate the probability of catching a Pokemon based on various factors.

## Usage

- **Basics:**
  Clicking on a Picture in Pokedex view or 'Best Catching Spots' marks a Pokemon as caught,
  by clicking on a caught Pokemon again, it gets 'released'

- **Options:**
  **Preferred Catching Method**
  Fastest, uses the fasted method to catch a mon.
  Cheapest, uses the cheapest way possible to catch a mon.

**Display Catch Probabilities**
Displays best 4 catch probabilities, based on chosen method.

**Display More Information**
This adds Rarities and Types to lists, some Pokemon have more rarities on locations,
thats why it shows more rarities. It will auto refresh when you mark something as caught.

Rarities: Common (5), Uncommon (9), Rare (10), Very Rare (12), Lure (2), Very Common (9)
Types: Grass (30), Water (6), Rocks (2), Old Rod (2), Good Rod (3), Super Rod (4)

## Notes/Disclaimer

Sadly the Pokedex of PokeMMO is not that good, e.g. it shows a location for Pokemon, but not exactly where, a good example are
Hitmonlee and Hitmonchan both can be caught in Kanto Victory Road, but not on the same floor.

Unova shows "Old Rod" but there is no Old Rod, just use "Super Rod"

**A lot of AI was used.**

## Credits

Used some data like dex.json, catchRates.json, location.json and the base of the catching formula from PokeMMO hub https://github.com/PokeMMO-Tools/pokemmo-hub.

The Pokedex information is from PokeMMO resource dump.
