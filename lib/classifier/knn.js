var _ = require('lodash');
var Q = require('q');
var Parallel = require('paralleljs');
var timing = require('timing')();
var worker = require('../../example/knn/worker');

module.exports = function (properties) {
    var model = {};

    /**
     * Total number of neighbors to use when making predictions
     */
    model.neighbors = parseInt(properties.neighbors);
    
    /**
     *
     */
    model.training = function (X, Y) {
        var deferTrain = Q.defer();
        model.features = X;
        model.targets = Y;
        deferTrain.resolve();
        return deferTrain.promise;
    };

    /**
     * Calculates distance between all points in dataset and x
     * finds closes neighbors and returns majority class
     */
    model.predicting = function (x) {
        return model.soryByDistanceTo(x).then(function (sortedFeatures) {
            var votes = {}, count = 0;

            for (var feature in sortedFeatures) {
                var index = _.indexOf(model.features, sortedFeatures[feature]);
                var featureClass = model.targets[index];
                
                if (votes[featureClass]) {
                    votes[featureClass] = votes[featureClass] + 1;
                } else {
                    votes[featureClass] = 1;
                }

                count++;
                if (count >= model.neighbors) {
                    break;
                }
            }

            var majorityClass = null, majorityClassCount = 0;
            
            for (var vote in votes) {
                if (votes[vote] > majorityClassCount) {
                    majorityClass = vote;
                    majorityClassCount = votes[vote];
                }
            }

            return majorityClass;
        });
    };

    /**
     * returns feature array sorted by distance from x
     *
     * @return  array
     */
    model.soryByDistanceTo = function (x) {
        // return Q(_.sortBy(model.features , function (feature) {
        //     return model.getDistanceBetween(feature, x);
        // }));
        timing.time('soryByDistanceTo');
        console.log('total length:', model.features.length);
        var featureses = split8(model.features);

        var sortedFeatures = _.map(featureses, function (features) {
            console.log('subset length:', features.length);
            return worker({
                fn: function (features) {
                    return features.map(function (feature) {
                        feature.distance = getDistanceBetween(feature, x);
                        return feature;
                    });
                }, 
                inject: { getDistanceBetween: model.getDistanceBetween, x: x }
            }).spawnWith(features);
        });

        return Q.all(sortedFeatures).then(function (featureses) {
            console.log('all the rest');

            var features = _.flatten(featureses);
            console.log('length', features.length);

            console.log('soryByDistanceTo:', timing.timeEnd('soryByDistanceTo').duration);

            var sorted = _.sortBy(features, function (feature) {
                return feature.distance;
            });

            console.log(sorted.length);
            return sorted;
        });
    };

    var split8 = function (arr) {
        var chunk = Math.floor(arr.length / 8);

        return _.map(_.range(8), function (piece) {
            var a = arr.splice(piece * chunk, chunk);
            return a;
        });
    };

    /**
     * Returns euclidean distance between item1 and item2
     *
     * @return  float
     */

    model.getDistanceBetween = function (feature, x) {
        var sum = feature.reduce(function (sum, i, key) {
             return sum + Math.pow(i - x[key], 2);
        }, 0);
        var result = Math.sqrt(sum) / feature.length;

        return result;
    };

    return model;
};
