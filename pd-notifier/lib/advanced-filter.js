"use strict";
function AdvancedFilterCompiler()
{
    var self = this;
    this.debug = 0;
    this.compilers = {
        bool_op: function compile_bool_op(kwdef, stack) {
            if (stack.nextUnexpected('bool_op')) return false;
            stack.push({
                next: { property: true, paren_left: true, bool_un: true },
                bool_op: true,
                code: '(' + stack.pop().code + ') ' + kwdef.code + ' ',
            });
            return true;
        },
        bool_un: function compile_bool_un(kwdef, stack) {
            if (stack.top() && stack.nextUnexpected('paren_left')) return false;
            stack.push({
                next: { property: true, paren_left: true, bool_un: true },
                bool_op: true,
                code: kwdef.code + ' ',
            });
            return true;
        },
        property: function compile_property(kwdef, stack) {
            if (stack.top() && stack.nextUnexpected('property')) return false;
            stack.push( {
                next: { prop_op: true},
                code: kwdef.code
            });
            return true;
        },
        prop_op: function compile_prop_op(kwdef, stack) { 
            if (stack.nextUnexpected('prop_op')) return false;
            stack.push({
                next: { string: true},
                lhs:  stack.pop(),
                code: kwdef.code,
                add_rhs_and_push: function(rhs, stack) {
                    var op = this;
                    return stack.pushBool(
                        '( ((lhs,rhs) => lhs.reduce( (acc, item) => acc || (' + op.code + ')(item, rhs), false )) (' + op.lhs.code + ', ' + rhs + ') )'
                    );
                }
            });
            return true;
        },
        string: function compile_string(strdef, stack) {
            if (stack.nextUnexpected('string')) return false;
            return stack.pop().add_rhs_and_push(strdef.code, stack);
        },
        paren_left: function compile_paren_left(_unused, stack) {
            if (stack.top() && stack.nextUnexpected('paren_left')) return false;
            stack.push({
                next:{ property: true, paren_left: true, bool_un: true },
                paren_left: true
            })
            return true;
        },
        paren_right: function compile_paren_right(_unused, stack) {
            if (stack.top() && stack.nextUnexpected('paren_right')) return false;
            var code = '(' + stack.pop().code + ')';
            if (! stack.safetop().paren_left) {
                console.log("Expected left parenthesis on stack, got:", stack.top());
                return false;
            }
            stack.pop();
            return stack.pushBool(code);
        },
    };
    this.tokens = {
        whitespace:{
            rx: /^\s+/,
            insert: (matchObject, stack) => true,
        },
        keyword:{
            rx: /^([A-Za-z][_A-Za-z0-9]+|=)/,
            insert: function insert_keyword(matchObject, stack) {
                var kwdef  = self.keywords[matchObject[0]];
                var parser = kwdef && self.compilers[kwdef.type];
                if (parser)
                    return parser(kwdef, stack);
                if (self.debug) console.log("Unknown parser for:", matchObject);
                return false;
            },
        },
        string:{
            rx: /^('[^\\']*'|"[^\\"]*")/, //"',
            insert: (matchObject, stack) => self.compilers.string({code: matchObject[0]}, stack),
        },
        paren_left: {
            rx: /^\(/,
            insert: self.compilers.paren_left,
        },
        paren_right: {
            rx: /^\)/,
            insert: self.compilers.paren_right,
        },
    };
    this.keywords = {
        'AND':        { type:'bool_op',  code: '&&' },
        'OR':         { type:'bool_op',  code: '||' },
        'NOT':        { type:'bool_un',  code: '!'  },

        'service_id': { type:'property', code: '[ incident.service.id ]'},
        'team_id':    { type:'property', code: 'incident.teams.map( x => x && x.id )'},
        'user_id':    { type:'property',
                        code: 'incident.assignments.map( x => x && x.assignee && x.assignee.id )'},

        '=':          { type:'prop_op',  code: '( (prop, value) => (prop == value) )' },
    };

    this.compileAdvancedFilter = function compileAdvancedFilter(filter) {
        var stack = [];
        stack.top       = function () { return this[this.length - 1 ]; };
        stack.safetop   = function () { if (this.length == 0) return {}; else return this[this.length - 1]; };
        stack.next      = function () { var n = stack.safetop().next; if (n) return n; else return {}; };
        stack.nextUnexpected = function (name) {
            if (stack.next()[name]) return false;
            if (self.debug) console.log("[" + name + "] object on stack does not want me!", stack.top());
            return true;
        };
        stack.pushBool  = function (code) {
            if (self.debug > 3) console.log("[Pushing bool]", code);
            if (this.safetop().bool_op) {
                var op = this.pop();
                return this.pushBool( op.code + '(' + code + ')' );
            } else {
                this.push({
                    next: { bool_op: true, paren_right: true },
                    code: code
                });
                if (self.debug > 3) console.log("Stack:", this);
                return true;
            }
        };
        var pos = 0;

        while (filter.slice(pos).length > 0) {
            var match = false;
            for (var token in self.tokens) {
                var match = self.tokens[token].rx.exec(filter.slice(pos));
                if (match) {
                    if (self.debug > 3)
                        console.log("\nToken:", token, " match:", match);
                    if (!self.tokens[token].insert(match, stack))
                        // expression error
                        return null;
                    if (self.debug > 3)
                        console.log("Stack:", stack);
                    pos += match[0].length;
                    break;
                }
            }
            if (! match) {
                if (self.debug) console.log("Invalid token: '" + filter.slice(pos) + "'");
                return null;
            }
        }
        if (self.debug > 3) console.log("Input end, stack:", stack);
        if (stack.length == 1 && stack.next().paren_right) { //Expression may be enclosed in parentheses
            if (self.debug > 1)
                return stack[0].code;
            try {
                return Function('incident', 'return (' + stack[0].code + ');');
            } catch (err) {
                // Internal error
                console.log(err);
                return null;
            }
        } else if (stack.length == 0) {
            // empty expression
            return false;
        } else {
            // invalid expression
            return null;
        }
    }
};


var compileAdvancedFilter = (function () {
    var compiler = new AdvancedFilterCompiler();
    return x => compiler.compileAdvancedFilter(x);
})();

// SELF TEST in Node.js
if ((typeof process === 'object') && (typeof process.release === 'object') && process.release.name === 'node') {
    var compiler = new AdvancedFilterCompiler();
    var incident = {
        assignments:[ { assignee:{ id:"PUSER1" } }, { assignee:{ id:"PUSER2" } } ],
        teams:[ { id:"PTEAM1" }, { id:"PTEAM2" } ],
        service: { id: "PSERVICE1" }
    };
    var tests = {
        '':"empty",
        ' user_id = "P123456" ':false,
        ' user_id = "PUSER1" ':true,
        ' team_id = "P123456" ':false,
        ' team_id = "PTEAM1" ':true,
        ' service_id = "P123456" ':false,
        ' service_id = "PSERVICE1" ':true,
        ' NOT service_id = "PSERVICE1" ':false,
        ' NOT service_id = "P123456" ':true,
        ' user_id = "PUSER1" AND service_id = "POFF" OR team_id = "PTEAM1" OR user_id = "POOH" ':true,
        ' (user_id = "PUSER1") AND service_id = "POFF" OR team_id = "PTEAM1" OR user_id = "POOH" ':true,
        ' (user_id = "PUSER1" AND service_id = "POFF") OR ( ( team_id = "PTEAM1" OR user_id = "POOH") ) ':true,
        ' (user_id = "PUSER1" AND service_id = "POFF") OR (team_id = "PTEAM1" AND user_id = "POOH") ': false,
    };

    var logResult = function(test, value) {
        if (tests[test] == value)
            console.log(" [ok] , Result:", value);
        else {
            console.log("!FAIL!, Result:", value);
            compiler.debug = 5;
            console.log(compiler.compileAdvancedFilter(filter));
        }
    };

    for (var filter in tests) {
        console.log("\nCompiling:", filter);
        compiler.debug = 1;
        var f = compiler.compileAdvancedFilter(filter);
        if (!f) {
            if (f == false) logResult(filter, "empty")
            else logResult(filter, "invalid")
        } else logResult(filter, f(incident));
    };
}
