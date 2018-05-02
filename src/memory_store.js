'use strict';
const STATUSES = require('./states_def')

const store = {
    // Error map uses second for the key,  
    // the value is the count of errors that occurred in that second
    
    // { breaker_name: {errors: {}, state: { status:'CLOSED', last_updated_at: now() , half_open_calls:0   } }}
    cb_state: new Map(),
    
    // TODO: Prevent creation init of store without valid config object.
    // Initialize state for given circuit breaker name
    init:function(cb_name,config){
        var self = this
        var current_second = self.getCurrentSecond()
        var initState = {
            errors: new Map(), 
            status:STATUSES.CLOSED , 
            last_updated_at: current_second,
            half_open_calls:0,
            config:config
            }
        self.cb_state.set(cb_name, initState )
    },
    exists: function(cb_name){
        var self = this
        var cb_state = self.cb_state.get(cb_name)
        return cb_state != null && cb_state != undefined
    },
    getConfig:function(cb_name){
        var self = this
        return self.cb_state.get(cb_name).config
    },
    getState:function(cb_name){
        var self = this
        return self.cb_state.get(cb_name)
    },

    getStatus: function(cb_name){
        var self = this
        return self.getState(cb_name).status
    },
    setStatus:function (cb_name, status){
        var self = this        
        var state = self.cb_state.get(cb_name)
        // reset tracking of half open calls and last updated time
        // Every time that the CB status is changed            
        state.last_updated_at = self.getCurrentSecond()        
        state.status = status
    },
    //  Reuturn number of seconds that Circuit Breaker has been in curent state.
    getElapsedSeconds:function(cb_name){
        var self = this
        var state = self.getState(cb_name)
        if (state != undefined){
            return self.getCurrentSecond() - state.last_updated_at
        }
        return 0;
    },   
    // Increment erros by second
    incrementError: function(cb_name){        
        var self = this        
        var current_second = self.getCurrentSecond()

        // Increment the counter for the given circuit breaker
        var cb_state    = self.cb_state.get(cb_name)
        var count       = cb_state.errors.get(current_second) || 0            
        cb_state.errors.set(current_second, count +1 )                        
    },     
    getErrorCount(cb_name){
        const self = this
        var state             = self.getState(cb_name)
        if (state == undefined){
            return 0
        }
        // state.errors is a map that counts errors by second.  
        // Key of each entry is second recorded, value is number of errors in that second

        // Loop through and remove any seconds older sinceSeconds
        var current_second = this.getCurrentSecond()
        state.errors.forEach(function(value,error_timestamp, map){
            if( error_timestamp < current_second - state.config.window){
                state.errors.delete(error_timestamp)
            }
        })
        
        // Sum remaining errors for each entry left in errors map
        var total = 0
        state.errors.forEach(function(value){
            total = total + value
        })        

        return total
    },
    incrementHalfOpenCalls:function(cb_name){
        var self = this
        var cb_state = self.cb_state.get(cb_name)
        cb_state.half_open_calls++
    },
    getHalfOpenCalls: function(cb_name){
        var self = this
        var cb_state = self.cb_state.get(cb_name)
        return cb_state.half_open_calls
    },
    resetHalfOpenCalls:function(cb_name){
        var self = this
        var cb_state = self.cb_state.get(cb_name)
        cb_state.half_open_calls = 0
    },
    getCurrentSecond:function(){
        return Math.floor(new Date().getTime() / 1000)
    },
}

module.exports = store