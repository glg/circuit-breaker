const expect = require('chai').expect;
const state = require ('../src/state');
const STATUSES = require('../src/states_def')

describe('#State',function(){
    beforeEach(function(){
        state.init('test_circuit_breaker',{});  
    })
    describe('#getStatus', function(){
        it('should initially be in closed state', function(){
            expect(state.getStatus('test_circuit_breaker')).to.equal('CLOSED')
        })
    })
    describe('#exists',function(){
        it('should return true if the circuit breaker has been initialized', function(){
            expect(state.exists('test_circuit_breaker')).to.be.true
        })
        it('should return false if the circuit breaker has NOT been initialized', function(){
            expect(state.exists('non-existent-breaker')).to.be.false
        })
    })
    describe('#setStatus', function(){
        it('should set the status of the circuit breaker', function(){
            expect(state.getStatus('test_circuit_breaker')).to.equal('CLOSED')

            state.setStatus('test_circuit_breaker',STATUSES.OPEN)
            expect(state.getStatus('test_circuit_breaker')).to.equal('OPEN')

            state.setStatus('test_circuit_breaker',STATUSES.HALF_OPEN)
            expect(state.getStatus('test_circuit_breaker')).to.equal('HALF_OPEN')

            state.setStatus('test_circuit_breaker',STATUSES.CLOSED)
            expect(state.getStatus('test_circuit_breaker')).to.equal('CLOSED')
        })
        it('should reset half open calls to zero when status is changed from half open to closed', function(){
            state.setStatus('test_circuit_breaker',STATUSES.HALF_OPEN)
            state.incrementHalfOpenCalls('test_circuit_breaker')
            
            expect(state.isHalfOpenCallAllowed('test_circuit_breaker')).to.equal(false)
            
            // When CB is closed then half opened again, a half open call should once again be allowed
            state.setStatus('test_circuit_breaker',STATUSES.CLOSED)
            state.setStatus('test_circuit_breaker',STATUSES.HALF_OPEN)
            
            expect(state.isHalfOpenCallAllowed('test_circuit_breaker')).to.equal(true)
        })
    })
    describe('#getErrorCount', function(){
        it('should get the number of errors that have occurred for a given CB', function(){
            state.init('test_circuit_breaker_2')
            expect(state.getErrorCount('test_circuit_breaker')).to.equal(0)


            state.incrementError('test_circuit_breaker')
            expect(state.getErrorCount('test_circuit_breaker')).to.equal(1)
            expect(state.getErrorCount('test_circuit_breaker_2')).to.equal(0)
        })
    })

    describe('#incrementError', function(){
        it('should increment the count of errors for a given circuit breaker', function(){
            state.init('test_circuit_breaker_2',{})

            state.incrementError('test_circuit_breaker')
            state.incrementError('test_circuit_breaker')
            state.incrementError('test_circuit_breaker')
            state.incrementError('test_circuit_breaker')
            state.incrementError('test_circuit_breaker')


            state.incrementError('test_circuit_breaker_2')
            state.incrementError('test_circuit_breaker_2')
            
            expect(state.getErrorCount('test_circuit_breaker')).to.equal(5)
            expect(state.getErrorCount('test_circuit_breaker_2')).to.equal(2)
            
        })
    })
    describe('#incrementHalfOpenCalls', function(){
        it('should track the number of calls made to a half open circuit breaker', function(){
            state.setStatus('test_circuit_breaker',STATUSES.HALF_OPEN)

            state.incrementHalfOpenCalls('test_circuit_breaker')
            state.incrementHalfOpenCalls('test_circuit_breaker')
            state.incrementHalfOpenCalls('test_circuit_breaker')
            state.incrementHalfOpenCalls('test_circuit_breaker')

            expect(state.getHalfOpenCalls('test_circuit_breaker')).to.equal(4)
        })
        it('should track the number of calls separately by CB name', function(){
            state.init('other_breaker',{})

            state.setStatus('test_circuit_breaker',STATUSES.HALF_OPEN)
            state.setStatus('other_breaker',STATUSES.HALF_OPEN)

            state.incrementHalfOpenCalls('test_circuit_breaker')
            state.incrementHalfOpenCalls('other_breaker')
            state.incrementHalfOpenCalls('other_breaker')
            state.incrementHalfOpenCalls('other_breaker')
            expect(state.getHalfOpenCalls('test_circuit_breaker')).to.equal(1)
            expect(state.getHalfOpenCalls('other_breaker')).to.equal(3)
        })
    })


    describe('#isHalfOpenCallAllowed', function(){
        it('should return weather or not a call will be allowed through CB when in half open state', function(){
            state.setStatus('test_circuit_breaker',STATUSES.HALF_OPEN)
            
            expect(state.isHalfOpenCallAllowed('test_circuit_breaker')).to.be.true

            state.incrementHalfOpenCalls('test_circuit_breaker')

            expect(state.isHalfOpenCallAllowed('test_circuit_breaker')).to.be.false
        })
    })
    describe('#getConfig', function(){
        it('should return the config for a given CB', function(){
            state.init('other_breaker', {other:true, breaker:true })            
            expect(state.getConfig('test_circuit_breaker')).to.not.be.null
            expect(state.getConfig('other_breaker').other).to.equal(true)
            expect(state.getConfig('other_breaker').breaker).to.equal(true)
        })
    })

    describe('#isCircuitBrekerTimedout', function(){
        it('should return weather a circuit breaker has timed out', function(){
            expect(state.isCircuitBreakerTimedout('test_circuit_breaker')).to.be.false
            // set the timeout back in time to artificially make it timeout
            state.init('timedout_breaker',{cb_timeout:-10})
            state.setStatus('timedout_breaker', STATUSES.OPEN)

            expect(state.isCircuitBreakerTimedout('timedout_breaker')).to.be.true

        })
    })

    describe('#isCircuitBrekerTripped', function(){
        it('should return weather a circuit breaker has exceeded the threshold number of errors required to open', function(){
            expect(state.isCircuitBreakerTripped('test_circuit_breaker')).to.be.false
            // set the timeout back in time to artificially make it timeout
            for( var i = 0 ; i < 30; i++){
                state.incrementError('test_circuit_breaker')
            }
            
            expect(state.isCircuitBreakerTripped('test_circuit_breaker')).to.be.true

        })
    })

    describe('#processResult', function(){
        it('should increment an error if error count if error is processed', function(){
            state.processResult('test_circuit_breaker',new Error('mock Error'), null, STATUSES.CLOSED)
            expect(state.getErrorCount('test_circuit_breaker')).to.equal(1)
        })
        it('should trip circuit open if status is half opened and result is an error', function(){
            state.setStatus('test_circuit_breaker',STATUSES.HALF_OPEN)
            state.processResult('test_circuit_breaker',new Error('mock Error'), null, STATUSES.HALF_OPEN)
            
            expect(state.getStatus('test_circuit_breaker')).to.equal(STATUSES.OPEN)
        })
        it('should trip cicuit open if status is closed and threshold errors have been encountered wihin time window', function(){
            for( var i = 0 ; i < 30; i++){
                state.processResult('test_circuit_breaker',new Error('mock Error'), null, STATUSES.CLOSED)
            }
            expect(state.getStatus('test_circuit_breaker')).to.equal(STATUSES.OPEN)
        })

        it('should close cicuit if status at call time was half open and result was NOT an error', function(){
            state.setStatus('test_circuit_breaker',STATUSES.HALF_OPEN)
            state.processResult('test_circuit_breaker',null, {result:'any'}, STATUSES.HALF_OPEN)
            
            expect(state.getStatus('test_circuit_breaker')).to.equal(STATUSES.CLOSED)

        })
    })

})


        // it('should return OPEN after when threshold errors have been encountered withing time window',function(){
            // for (var i =0; i < 30; i++){
                // state.processResult('test_circuit_breaker',new Error('mock error'),null, STATUSES.CLOSED) 
            // }
            // expect(state.getStatus('test_circuit_breaker')).to.equal('OPEN')
        // })
