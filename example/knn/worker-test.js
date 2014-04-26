var Q = require('q');
var _ = require('lodash');
var timing = require('timing')();
var Parallel = require('paralleljs');
var Worker = require('webworker-threads').Worker;
var numCPUs = require('os').cpus().length;

// var testArray = [42, 43, 44];
var testArray = _.range(37, 45); // inclusive - exclusive (i.e. _.rang(10, 12) == [10, 11] )

////////////////////////////////////////////

//testWorkers();
testQ().then(testParallel);

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
    timing.time('Worker');

    var responses = [], completedWorkers = 0;

    var workers = _.map(_.range(numCPUs), function (i) {
        var W = new Worker(__dirname+'/worker.js');

        W.onmessage = function (event) {
            responses.push(event.data.result);
            
            if (event.data.closing) {
                completedWorkers++;
            }

            if (completedWorkers == testArray.length) {
                console.log('Worker:', timing.timeEnd('Worker').duration);
                console.log(responses);
                console.log('--');
            }
        };

        return W;
    });

    _.each(testArray, function (W, key) {
        var index = Math.round(key % 8);
        workers[index].postMessage(testArray[key]);
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
