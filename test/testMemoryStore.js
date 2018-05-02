
const expect = require('chai').expect;
const store = require ('../src/memory_store');
const STATUSES = require('../src/states_def')

describe("Store", function(){    
    const default_config = {
        window: 5,  // length of window in seconds
        threshold: 10, // # of errors and timouts tolerated within window
        request_timeout: 30, // # of seconds before request is considered failed
        cb_timeout: 60, // Amount of time that CB remains closed before changing to half open
    }

    beforeEach(function(){
        store.init('test_circuit_breaker',default_config);  
    })
    describe('#init',function(){
        it('should create a store that has zero errors',function(){
            expect(store.getErrorCount('test_circuit_breaker')).to.equal(0)
        })
        it('should have an initial status of 0',function(){
            expect(store.getStatus('test_circuit_breaker')).to.equal(STATUSES.CLOSED)
        })
        it('should have a valid config', function(){
            var config = store.getConfig('test_circuit_breaker') 
            expect(config).to.equal(default_config)
        })
    })
    describe('#getConfig', function(){
        it('should return the configuration set when store is initialized', function(){
            var config = store.getConfig('test_circuit_breaker') 
            expect(config).to.equal(default_config)
        })
    })
    describe('#incrementError', function(){        
        it('should increment the error count',function(){
            store.incrementError('test_circuit_breaker')                    
            expect(store.getErrorCount('test_circuit_breaker')).to.equal(1)
            
        })
        it('should increment the error count separately for different named circuit breakers',function(){
            store.init('test_circuit_breaker_2',{}); 
            store.incrementError('test_circuit_breaker_2')                    
            store.incrementError('test_circuit_breaker')                    
            store.incrementError('test_circuit_breaker')                    
            store.incrementError('test_circuit_breaker')                    
            store.incrementError('test_circuit_breaker')                    
            

            store.incrementError('test_circuit_breaker_2')                    
            store.incrementError('test_circuit_breaker_2')                    
            
            expect(store.getErrorCount('test_circuit_breaker')).to.equal(4)
            expect(store.getErrorCount('test_circuit_breaker_2')).to.equal(3)
            
        })

        /*
        // Commented out because requires wait that slows down test.  
        // Can uncomment when needed
        it('should increment across seconds',function(done){
            store.incrementError('test_circuit_breaker')  
            sleep(1000).then(function(){
                store.incrementError('test_circuit_breaker')                    
                store.incrementError('test_circuit_breaker')                    
                store.incrementError('test_circuit_breaker')                    
                
                console.log(store.errors)
                
                expect(store.getErrorCount('test_circuit_breaker')).to.equal(4)            
                done()
            })
          })
          */
    })
    describe('#getState', function(){
        it('should return the state object available stored by the class', function(){
            var state = store.getState('test_circuit_breaker')
            expect(state.status).to.equal(STATUSES.CLOSED)
            expect(state.half_open_calls).to.equal(0)
        })
    })
    describe('#setStatus',function(){
        it('should allow setting the status to of the circuit breaker by name',function(){
            store.setStatus('test_circuit_breaker',STATUSES.OPEN)
            expect(store.getStatus('test_circuit_breaker')).to.equal(STATUSES.OPEN)
            
            store.init('second_test_cb',default_config)
            expect(store.getStatus('second_test_cb')).to.equal(STATUSES.CLOSED)
        })
    })
    describe('#getElapsedSeconds',function(){
        it('should return number of seconds since last change of CB status',function(){
            expect(store.getElapsedSeconds('test_circuit_breaker')).to.equal(0)
        })
        /*
        // Commented out because requires wait that slows down test.  
        // Can uncomment when needed
       
        it('should return number of seconds since last change of CB status',function(done){
            expect(store.getElapsedSeconds('test_circuit_breaker')).to.equal(0)
            sleep(1000).then(function(){
                store.incrementError('test_circuit_breaker')                    
                store.incrementError('test_circuit_breaker')                    
                store.incrementError('test_circuit_breaker')                    
                
                console.log(store.errors)
                
                expect(store.getElapsedSeconds('test_circuit_breaker')).to.equal(1)            
                done()
            })
        })
        */
    })

    describe('#getErrorCount', function(){
        it('should return the number of errors that have occurred', function(){
            store.incrementError('test_circuit_breaker')
            store.incrementError('test_circuit_breaker')
            store.incrementError('test_circuit_breaker')
            store.incrementError('test_circuit_breaker')
            store.incrementError('test_circuit_breaker')
            store.incrementError('test_circuit_breaker')
            store.incrementError('test_circuit_breaker')
            
            expect(store.getErrorCount('test_circuit_breaker'),7)            
        })

        it('should ignore errors that are older than number of seconds defined in config (window)', function(){
            // Add errors as usual with current second as timestamp
            store.incrementError('test_circuit_breaker')
            store.incrementError('test_circuit_breaker')
            store.incrementError('test_circuit_breaker')
            store.incrementError('test_circuit_breaker')
            store.incrementError('test_circuit_breaker')
            store.incrementError('test_circuit_breaker')
            store.incrementError('test_circuit_breaker')

            // Now modify getCurrentSecond to advance the time beyond configured window
            // in which errors are counted.
            var originalGetCurrentSecond = store.getCurrentSecond
            store.getCurrentSecond = function(){
                return originalGetCurrentSecond() + default_config.window + 10
            }

            expect(store.getErrorCount('test_circuit_breaker')).to.equal(0)    
            
            // add more errors with new advanced time
            store.incrementError('test_circuit_breaker')
            store.incrementError('test_circuit_breaker')
            store.incrementError('test_circuit_breaker')
            
            expect(store.getErrorCount('test_circuit_breaker')).to.equal(3)    
            
            // restore original getCurrentSecond method
            store.getCurrentSecond = originalGetCurrentSecond
            
        })
    })
    describe('#incrementHalfOpenCalls',function(){
        it('should track the number of half open calls that have been made', function(){
            store.incrementHalfOpenCalls('test_circuit_breaker')
            store.incrementHalfOpenCalls('test_circuit_breaker')
            store.incrementHalfOpenCalls('test_circuit_breaker')
            store.incrementHalfOpenCalls('test_circuit_breaker')
            store.incrementHalfOpenCalls('test_circuit_breaker')
            expect(store.getHalfOpenCalls('test_circuit_breaker')).to.equal(5)            
        })
    })

    describe('#getHalfOpenCalls', function(){
        it('should return the number of half open calls that have been made to a CB', function(){
            expect(store.getHalfOpenCalls('test_circuit_breaker')).to.equal(0)
            store.incrementHalfOpenCalls('test_circuit_breaker')
            expect(store.getHalfOpenCalls('test_circuit_breaker')).to.equal(1)

        })
    })
    describe('#resetHalfOpenCalls', function(){
        it('should reset number of half open calls for CB to zero', function(){
            store.incrementHalfOpenCalls('test_circuit_breaker')
            store.incrementHalfOpenCalls('test_circuit_breaker')
            store.incrementHalfOpenCalls('test_circuit_breaker')
            store.incrementHalfOpenCalls('test_circuit_breaker')
            store.incrementHalfOpenCalls('test_circuit_breaker')
            expect(store.getHalfOpenCalls('test_circuit_breaker')).to.equal(5)            

            store.resetHalfOpenCalls('test_circuit_breaker')
            expect(store.getHalfOpenCalls('test_circuit_breaker')).to.equal(0)            

        })
    })
})

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }