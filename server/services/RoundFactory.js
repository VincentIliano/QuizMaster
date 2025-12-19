
const StandardRound = require('../models/StandardRound');
const FreezeOutRound = require('../models/FreezeOutRound');
const ConnectionsRound = require('../models/ConnectionsRound');

class RoundFactory {
    static createRound(roundData) {
        if (!roundData) {
            throw new Error("Round data is required to create a round instance.");
        }

        switch (roundData.type) {
            case 'countdown':
            case 'freezeout': // Alias
                return new FreezeOutRound(roundData);
            case 'connections':
                return new ConnectionsRound(roundData);
            case 'standard':
            default:
                return new StandardRound(roundData);
        }
    }
}

module.exports = RoundFactory;
