'use strict';
const state = require("./state")
const STATUSES = require('./states_def')
const default_config = {
    window: 5,  // length of window in seconds
    threshold: 10, // # of errors and timouts tolerated within window
    request_timeout: 30, // # of seconds before request is considered failed
    cb_timeout: 60, // Amount of time that CB remains closed before changing to half open
}

const CircuitBreaker = {
    factory: function(name,object, method, config){
        if (!config){
            config = default_config
        }
        // Make sure default keys exist in the config object if they are not supplied in config parameter
        config = Object.assign(default_config, config)

        if(typeof object === 'object')
            return new MethodBreaker(name,object,method, config)
        else   
            throw new Error('object parameter must be a valid object type') 
            // return new FunctionBreaker(name,method)
    }
    
}

// Crete a circuit breaker with the given name
// name - is the name of the circuit breaker
// object - is the instance of the object the method belongs to
// method   - is the function being wrapped within the circuit breaker
// config - the configuration applied to the circuit breaker for given method
var MethodBreaker = function(name, object, method,config){
    this.name = name
    this.context = object
    this.method = method
    this.config = config
    if(!state.exists(name)){
        state.init(name, config)
    }
}

// Wrapped method must have signiture:
// function(args*, callback)
MethodBreaker.prototype.execute = function(){
    const self              = this
    var config              = state.getConfig(self.name)
    var args                = Array.from(arguments)
    const original_callback = args.pop();
    
    // Ensure last argument to function is a callback
    if (typeof original_callback !== 'function'){
        throw new Error('Functions used with Breaker must have callback function as final parameter')
    }    
    var status_at_call_time = state.getStatus(self.name)
    
    // If the CB is open but has timed out.  Change the CB to half open to allow one call through
    if(status_at_call_time == STATUSES.OPEN && state.isCircuitBreakerTimedout(self.name)){
        state.setStatus(self.name,STATUSES.HALF_OPEN)
        state.incrementHalfOpenCalls(self.name)
        status_at_call_time = state.getStatus(self.name)
    }


    // Increment the Error count if the timeout is not cleared before timeout threshold elapses
    var timeout_id = setTimeout(
        function(){ 
            state.processResult(self.name,new Error('Cicruit Breaker Timeout'), null, status_at_call_time)            
        } 
        , config.request_timeout * 1000 )
    
    // swap out the original callback with a spy that can monitor the results.
    const spy_callback = function(err, result){
        // We have a response so clear the timeout
        clearTimeout(timeout_id)
        
        // Process result, count error or update CB status if needed
        state.processResult(self.name, err, result, status_at_call_time)            
        
        
        // Call original callback passed method
        original_callback(err,result)
    }
    args.push(spy_callback)

    // TODO: Circuit Breaker cannot be tripped currently.
    // TODO: Change this so taht method is only called if the Status is closed or half open and allowing requests
    // TODO: comment out next line
    self.method.apply(self.context, args)        
    // Call the wrapped function if the CB is closed, or half open and allowing calls
  /*  if(status_at_call_time == STATUSES.CLOSED || ( status_at_call_time == STATUSES.HALF_OPEN  && state.isHalfOpenCallAllowed(self.name))) {
        // TODO: uncomment next line
        // self.method.apply(self.context, args)        
    }
    else{
        if(status_at_call_time == STATUSES.OPEN){
            original_callback(new Error('Circuit Breaker Open'), null)
        }
        else{
            original_callback(new Error('Circuit Breaker Half Open'), null)
        }
            
    }*/
    
    return status_at_call_time
    
}

module.exports = CircuitBreaker;