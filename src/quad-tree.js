(function(w){
    var ID = 0;
    /**
     *
     * @param bounds
     * @param options
     * @constructor
     */
    var QuadTree = function(bounds, options) {
        var self = this;
        self.bounds = bounds;
        options = options || {};
        self.max_objects = options.max_objects || 10;
        self.max_levels = options.max_levels || 4;
        self.level = options.level || 0;
        self.nodes = [];
        self.objects = [];
        self.groups = [];
        self.qtd = 0;
        self.parent = options.parent || null;
        self.loop_x = options.loop_x || false;
        self.loop_y = options.loop_y || false;
    };

    QuadTree.prototype.getCWidth = function(){
        var self = this;
        if(self.parent != null){
            return self.parent.getCWidth();
        }
        return self.bounds.width;
    };


    QuadTree.prototype.getCHeight= function(){
        var self = this;
        if(self.parent != null){
            return self.parent.getCHeight();
        }
        return self.bounds.height;
    };


    QuadTree.prototype.clear = function () {
        var self = this;

        self.objects.forEach(function(obj){
            if(obj.parents[self.level]){
                var index = obj.parents[self.level].indexOf(self);
                if(index != -1){
                    obj.parents[self.level].splice(index,1);
                }
            }
        });

        self.objects = [];
        self.groups = [];
        self.qtd = 0;
        var i;
        var length = self.nodes.length;

        for(i = 0; i < length;i++){
            self.nodes[i].clear();
        }
    };

    /**
     *
     * @param bounds
     */
    QuadTree.prototype.insert = function (bounds) {
        var self = this;

        if(bounds.id === undefined){
            bounds.id = ID;
            ID++;
        }

        if(bounds.groups === undefined){
            bounds.groups = ['default'];
        }

        var length = bounds.groups.length;
        var i;

        for(i =0; i < length;i++){
            var group = bounds.groups[i];
            if(self.groups[group] === undefined){
                self.groups[group] = [];
            }
            self.groups[group][bounds.id] = bounds;
        }

        self.objects[bounds.id] = bounds;

        if(bounds.parents == undefined){
            bounds.parents = [];
        }
        if(bounds.parents[self.level] == undefined){
            bounds.parents[self.level] = [];
        }
        var index = bounds.parents[self.level].indexOf(self);
        if(index == -1){
            bounds.parents[self.level].push(self);
        }

        var w = self.getCWidth();
        var h = self.getCHeight();

        if(bounds.xa == undefined){
            bounds.xa = calcloop(bounds.x,w);
        }
        if(bounds.xb == undefined){
            bounds.xb = calcloop(bounds.x + bounds.width,w)-bounds.width;
        }

        if(bounds.ya == undefined){
            bounds.ya = calcloop(bounds.y,h);
        }
        if(bounds.yb == undefined){
            bounds.yb = calcloop(bounds.y + bounds.height,h)-bounds.height;
        }

        self.qtd++;

        if(self.qtd > self.max_objects && self.level < self.max_levels) {
            if(self.nodes.length == 0){
                self.split();
            }
            for (i = 0; i < 4; i++) {
                if (overlap_loop(bounds, self.nodes[i].bounds,self.loop_x,self.loop_y)) {
                    self.nodes[i].insert(bounds);
                }
            }
        }
    };

    /**
     *
     * @returns {boolean}
     */
    QuadTree.prototype.isLeaf = function(){
        var self = this;
        return self.qtd <= self.max_objects || self.level == self.max_levels;
    };


    QuadTree.prototype.split = function () {
        var self = this;
        var level = self.level + 1;

        var x = self.bounds.x;
        var y = self.bounds.y;

        var width = self.bounds.width/2;
        var height = self.bounds.height/2;
        var x2 = x+width;
        var y2 = y+height;

        var options = {
            parent:self,
            max_objects:self.max_objects,
            max_levels:self.max_levels,
            level:level,
            loop_x:self.loop_x,
            loop_y:self.loop_y
        };

        self.nodes[0] = new QuadTree({
            x:x,
            y:y,
            width:width,
            height:height
        },options);

        self.nodes[1] = new QuadTree({
            x:x2,
            y:y,
            width:width,
            height:height
        }, options);

        self.nodes[2] = new QuadTree({
            x:x2,
            y:y2,
            width:width,
            height:height
        }, options);

        self.nodes[3] = new QuadTree({
            x:x,
            y:y2,
            width:width,
            height:height
        }, options);

        self.objects.forEach(function (object) {
            for (var j = 0; j < 4; j++) {
                if (overlap_loop(object, self.nodes[j].bounds,self.loop_x,self.loop_y)) {
                    self.nodes[j].insert(object);
                }
            }
        });
    };

    /**
     *
     * @param bounds
     */
    QuadTree.prototype.remove = function(bounds){
        QuadTree.remove(bounds);
    };

    /**
     *
     * @param group
     */
    QuadTree.prototype.removeGroup = function(group){
        var self = this;
        if(self.groups[group] != undefined){
            delete self.groups[group];
        }

        self.objects.forEach(function(obj,id){
            if(obj.groups.indexOf(group) != -1){
                delete self.objects[id];
            }
        });
        var length = self.nodes.length;
        for(var i =0; i < length;i++){
            self.nodes[i].removeGroup(group);
        }
    };

    /**
     *
     * @param bounds
     * @param group
     */
    QuadTree.removeGroup = function(bounds,group){
        var index = bounds.groups.indexOf(group);
        if(index != -1){
            bounds.groups.splice(index,1);
        }

        var length1 = bounds.parents;
        var length2;
        var i;
        var j;
        var parents;
        var parent;


        for(i = 0; i < length1;i++){
            parents = bounds.parents[i];
            length2 = parents.length;
            for(j = 0;j < length2;j++){
                parent = parents[j];
                if(parent.groups[group] != undefined){
                    delete parent.groups[group][bounds.id];
                }
            }
        }
    };

    /**
     *
     * @param bounds
     * @param group
     */
    QuadTree.addGroup = function(bounds,group){
        if(bounds.groups.indexOf(group) == -1){
            bounds.groups.push(group);
        }

        var length1 =  bounds.parents.length;
        var length2;
        var i;
        var j;
        var parents;
        var parent;

        for(i = 0; i < length1;i++){
            parents = bounds.parents[i];
            length2 = parents.length;
            for(j = 0; j < length2;j++){
                parent = parents[j];
                if(parent.groups[group] == undefined){
                    parent.groups[group] = [];
                }
                parent.groups[group][bounds.id] = bounds;
            }
        }
    };


    /**
     *
     * @param bounds
     */
    QuadTree.remove = function (bounds) {
        var length1 =  bounds.parents.length;
        var length2;
        var length3;
        var parents;
        var i;
        var j;
        var parent;
        var k;
        var group;

        for(i =0; i < length1;i++){
            parents = bounds.parents[i];
            length2 = parents.length;
            for(j = 0; j < length2;j++){
                parent = parents[j];
                delete parent.objects[bounds.id];
                length3 = bounds.groups.length;
                for (k = 0; k < length3; k++) {
                    group = bounds.groups[k];
                    if(parent.groups[group] != undefined){
                        delete parent.groups[group][bounds.id];
                    }
                }
                parent.qtd--;
                if(parent.qtd <= parent.max_objects && parent.nodes.length > 0){
                    parent.nodes = [];
                }
            }
        }
        bounds.parents = [];
        delete bounds.xa;
        delete bounds.xb;
        delete bounds.ya;
        delete bounds.yb;
    };

    /**
     *
     * @param bounds
     */
    QuadTree.reInsert = function(bounds){
        if(bounds.parents.length > 0){
            var parent = bounds.parents[0][0];
            while(parent.parent instanceof QuadTree){
                parent = parent.parent;
            }
            parent.remove(bounds);
            parent.insert(bounds);
        }
    };

    /**
     *
     * @param bounds
     * @param group
     * @returns {*}
     */
    QuadTree.prototype.retrieve = function(bounds,group){
        var self = this;
        self.insert(bounds);
        var collisions = QuadTree.getCollisions(bounds,group);
        self.remove(bounds);
        return collisions;
    };

    /**
     *
     * @param bounds
     * @param group
     * @returns {Array}
     */
    QuadTree.getCollisions = function(bounds,group){
        var si = bounds.parents.length-1;
        var i;
        var j;
        var collisions = [];
        var found = [];
        var length;
        var parent;


        for(i =  si; i >= 0;i--){
            length = bounds.parents[i].length;
            for(j = 0; j < length;j++){
                parent = bounds.parents[i][j];
                if(parent.isLeaf()){
                    var loop_x = parent.loop_x;
                    var loop_y = parent.loop_y;
                    if(group === undefined){
                        parent.objects.forEach(function(object,id){
                            if(id !== bounds.id  && found[object.id] === undefined){
                                var over = overlap_loop(bounds,object,loop_x,loop_y);
                                if(over){
                                    found[object.id] = true;
                                    over = Object.assign(over,{object:object._ref});
                                    collisions.push(over);
                                }
                            }
                        });
                    }
                    else if(parent.groups[group] !== undefined){
                        parent.groups[group].forEach(function(object,id){
                            if(id !== bounds.id && found[object.id] === undefined){
                                var over = overlap_loop(bounds,object,loop_x,loop_y);
                                if(over){
                                    found[object.id] = true;
                                    over = Object.assign(over,{object:object._ref});
                                    collisions.push(over);
                                }
                            }
                        });
                    }
                }
            }
        }

        return collisions;
    };

    function overlap_loop(a,b,loop_x,loop_y){
        var xa = [a.x];
        var ya = [a.y];
        var xb = [b.x];
        var yb = [b.y];
        var over;
        if(loop_x){
            if(a.xa != undefined && xa.indexOf(a.xa) == -1){xa.push(a.xa);}
            if(a.xb != undefined && xa.indexOf(a.xb) == -1){xa.push(a.xb);}
            if(b.xa != undefined && xb.indexOf(b.xa) == -1){xb.push(b.xa);}
            if(b.xb != undefined && xb.indexOf(b.xb) == -1){xb.push(b.xb);}
        }
        if(loop_y){
            if(a.ya != undefined && ya.indexOf(a.ya) == -1){ya.push(a.ya);}
            if(a.yb != undefined && ya.indexOf(a.yb) == -1){ya.push(a.yb);}
            if(b.ya != undefined && yb.indexOf(b.ya) == -1){yb.push(b.ya);}
            if(b.yb != undefined && yb.indexOf(b.yb) == -1){yb.push(b.yb);}
        }

        var length1 = xa.length;
        var length2 = ya.length;
        var length3 = xb.length;
        var length4 = yb.length;
        var i;
        var j;
        var k;
        var l;
        var ba;
        var bb;
        for(i = 0; i < length1;i++){
            for(j = 0; j < length2;j++){
                for(k = 0; k < length3;k++){
                    for(l = 0; l < length4;l++){
                        ba = {x:xa[i],y:ya[j],width: a.width,height: a.height};
                        bb = {x:xb[k],y:yb[l],width: b.width,height: b.height};
                        over = overlap(ba,bb);
                        if(over){
                            return over;
                        }
                    }
                }
            }
        }
        return false;
    }

    function calcloop(c,d){
        if(c < 0){
            while(c < -d){c = c%d;}
            return d+c;
        }
        else if(c > d){
            while(c > d){c = c%d;}
            return c;
        }
        return c;
    }

    /**
     *
     * @param a
     * @param b
     * @returns {boolean}
     */
    function overlap(a,b){
        if((a.x + a.width) <= b.x){
            return false;
        }
        else if((b.x + b.width) <= a.x){
            return false;
        }
        else if((a.y+ a.height) <= b.y){
            return false;
        }
        else if((b.y+b.height) <= a.y){
            return false;
        }
        return {
          xa: a.x,
          xb: b.x,
          ya: a.y,
          yb: b.y,
          wa: a.width,
          wb: b.width,
          ha: a.height,
          hb: b.height
        };
    }

    w.QuadTree = QuadTree;
})(window);

