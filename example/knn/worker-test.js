var Q = require('q');
var _ = require('lodash');
var timing = require('timing')();
var Parallel = require('paralleljs');
var worker = require('./worker');

// var testArray = [42, 43, 44];
var testArray = _.range(1, 40); // inclusive - exclusive (i.e. _.rang(10, 12) == [10, 11] )

////////////////////////////////////////////

// testQ();
// testParallel();
testWorkers();

////////////////////////////////////////////

function testQ() {
    timing.time('Q');
    var fibPromise = promisify(fib);
    return Q.all(_.map(testArray, function (x) {
        return fibPromise(x);
    })).then(function (result) {
        console.log('Q:', timing.timeEnd('Q').duration);
        console.log(result); 
        console.log('--');
    });    
}

////////////////////////////////////////////

function testParallel() {
    timing.time('Parallel');
    var p = new Parallel(testArray);
    return p.map(fib).then(function (result) {
        console.log('Parallel:', timing.timeEnd('Parallel').duration);
        console.log(result);
        console.log('--');
    });
}

////////////////////////////////////////////

function testWorkers() {
    timing.time('Workers');
    Q.all(_.map(testArray, function (x) {
        return worker({
            fn: function (x) {
                return fib(x);
            }, 
            inject: { fib: fib },
            // workers are not yet implemented
            workers: 8 // max # of CPUs 
        }).spawnWith(x);
    })).then(function (result) {
        console.log('Workers:', timing.timeEnd('Workers').duration);
        console.log(result);
        console.log('--');
    });
}

////////////////////////////////////////////

function promisify (fn) {
    return function () {
        var deferred = Q.defer();
        var args = _.toArray(arguments);
        _.defer(function () {
            var result = fn.apply(null, args);
            deferred.resolve(result);
        });
        return deferred.promise;
    };
}

function fib(n) {
    return n < 2 ? 1 : fib(n - 1) + fib(n - 2);
}
