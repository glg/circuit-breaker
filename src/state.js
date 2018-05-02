'use strict';
const inMemory = require('./memory_store')
const STATES = require('./states_def')
const default_config = require('./default_config')

const state = {
    // ToDo: Allow storeage mechanism to be configured.
    // Currently defaults to in memory storage
    store: inMemory, 
    init:function(cb_name, config, store_name){
        var self = this

        if (!config){
            config = default_config
        }
        // Make sure default keys exist in the config object if they are not supplied in config parameter
        config = Object.assign(default_config, config)

        self.store.init(cb_name, config)
        
    },
    getStatus: function(cb_name){
        var self    = this        
        return self.store.getStatus(cb_name)
        
    },
    setStatus: function(cb_name, status){
        var self = this
        if(status == STATES.CLOSED && self.getStatus(cb_name) == STATES.HALF_OPEN)
            self.store.resetHalfOpenCalls(cb_name)
        return self.store.setStatus(cb_name, status)
    },
    getErrorCount:function(cb_name){
        var self = this
        return self.store.getErrorCount(cb_name)
    },
    // Increment erros by second
    incrementError: function(cb_name){        
        var self = this        
        return self.store.incrementError(cb_name)
    },
    incrementHalfOpenCalls: function(cb_name){
        var self = this
        return self.store.incrementHalfOpenCalls(cb_name)
    },
    getHalfOpenCalls: function(cb_name){
        var self = this
        return self.store.getHalfOpenCalls(cb_name)
    },
    // Allow only one call to go through CB in half open state
    isHalfOpenCallAllowed:  function(cb_name ){
        var self = this
        var config = self.store.getConfig(cb_name)
        return self.store.getHalfOpenCalls(cb_name) == 0 
    },
    getConfig: function(cb_name){
        var self = this
        return self.store.getConfig(cb_name)
    },
    // Returns true if an open circuit should be changed to half open
    isCircuitBreakerTimedout:function(cb_name){
        var self = this
        var config = self.store.getConfig(cb_name)
        var current_second = new Date().getTime() / 1000
        // Compare time in current state with configured timeout period
        return self.store.getElapsedSeconds(cb_name) > config.cb_timeout 
    },
    isCircuitBreakerTripped: function(cb_name){
        var self = this
        var config = self.store.getConfig(cb_name)
        return self.store.getErrorCount(cb_name) >= config.threshold 
    },

    processResult: function (cb_name, err, result, status_at_call_time){
        var self = this
        if(err){
            self.incrementError(cb_name)
            // If half opened CB call has failed return to open
            if(status_at_call_time == STATES.HALF_OPEN){
                self.setStatus(cb_name, STATES.OPEN)
            }
            if(status_at_call_time == STATES.CLOSED && self.isCircuitBreakerTripped(cb_name)){
                self.setStatus(cb_name, STATES.OPEN)
            }
        }
        else if(!err && status_at_call_time == STATES.HALF_OPEN){
            self.setStatus(cb_name, STATES.CLOSED)
        }             
    },    
}
module.exports = state 