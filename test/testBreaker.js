const expect = require('chai').expect;
const CB = require('../src/breaker')
const STATUSES = require('../src/states_def')
const config = require('../src/default_config')
const sinon = require('sinon')

var mock_dependency = {
    fail: function (x,y, callback){
        callback(new Error('mock error'), null)
    },
    succeed: function(x,y, callback){
        callback(null, x * y )
    }
}
describe('#breaker',function(){
    var fail_breaker, succeed_breaker
    describe('#execute', function(){
        it('should call the original callback supplying the null error and result if successfule', function(done){
            var x = 3, y = 5
            var callback = function(err, result ){
                expect(err).to.be.null
                expect(result).to.be.equal(15)
                done()
            }
            succeed_breaker  = CB.factory('succeed_method',mock_dependency, mock_dependency.succeed, config )
            succeed_breaker.execute(x,y,callback)
        })
        it('should call original callback supplying non null error and null result when call fails',function(done){
            fail_breaker     = CB.factory('err_method_A',mock_dependency, mock_dependency.fail, config )
            var x = 3, y = 5
            var closed_callback = function(err, result ){
                // do nothing
            }
            var open_callback = function(err, result){
                expect(err).not.to.be.null
                expect(result).to.be.null
                done()
            }

            for (var i = 1; i <= config.threshold +1 ; i++ ){
                fail_breaker.execute(x,y,closed_callback)
            }
            fail_breaker.execute(x,y,open_callback)
        })

        it('should call callback with error when Circuit Breaker is closed',function(done){
            var x = 3, y = 5
            var callback = function(err, result ){
                expect(err).to.not.be.null
                expect(result).to.be.null
                done()
            }
            fail_breaker     = CB.factory('err_method_B',mock_dependency, mock_dependency.fail, config )

            fail_breaker.execute(x,y,callback)

        })
        

        it('should return an closed Circuit Breaker state when breaker is closed', function(){
            var x = 3, y = 5
            var callback = function(err, result ){
            }
            expect(succeed_breaker.execute(x,y,callback)).to.equal(STATUSES.CLOSED)
            // fail breaker should be closed on the first call
            expect(fail_breaker.execute(x,y,callback)).to.equal(STATUSES.CLOSED)
        })        
        it('should return an open Circuit Breaker state breaker fails more than the allowed threshold', function(){
            var x = 3, y = 5, status
            var callback = function(err, result ){
            }
            fail_breaker     = CB.factory('err_method_D',mock_dependency, mock_dependency.fail, config )

            // fail breaker should be open after one more than threshold fails
            // shoudl be closed before more than threshold fails reached 
            for (var i = 1; i <= config.threshold +1 ; i++ ){
                status = fail_breaker.execute(x,y,callback)                
                if(i <= config.threshold ){
                    expect(status).to.equal(STATUSES.CLOSED)        
                }
            }            
            expect(status).to.equal(STATUSES.OPEN)
        })   

        it('should not call the wrapped funciton after if the CB is open', function(){
            var spy = sinon.spy(mock_dependency,"fail")
            var breaker = CB.factory('fail_breaker_G',mock_dependency,mock_dependency.fail, config)
            
            for(var i = 0; i < config.threshold +30; i++ ){
                breaker.execute(1,2,function(){})                
            }
            // only call the number of times it is allowed to fail
            expect(spy.getCalls().length).to.equal(config.threshold)
        })
        it('should track state for breaker by name when it is recreated with the same name', function(){
            var x = 3, y = 5, status
            var callback = function(err, result ){
            }
            var renewed_fail_breaker = CB.factory('renewed_fail_breaker',mock_dependency,mock_dependency.fail, config)
            // fail breaker should be open after one more than threshold fails
            for (var i = 1; i <= config.threshold +1 ; i++ ){
                status = renewed_fail_breaker.execute(x,y,callback)                
            }            
            // should be open because if failed more then threshold times
            expect(status).to.equal(STATUSES.OPEN)
        })
        
    })
})