(function ($) {

    var _st = window.localStorage;

    var CS = {
        sort: function (d) {
            if (!d.length || typeof(d) !== 'object')
                return null;
            return d.map(function (v) {
                v.spell = v.alpha.replace(/\-/ig, '');
                v.initial = v.alpha.split('-').map(function (a) { return a[0]; }).join('');
                return v;
            }).sort(function (a, b) {
                return ((a.alpha[0] ? a.alpha[0].charCodeAt() : 0) - (b.alpha[0] ? b.alpha[0].charCodeAt() : 0));
            });
        },
        find: function (d, text, useKey) {
            var i = 0, l = d.length, rst = null;
            for (i = 0; i < l; i++) {
                if (useKey) {
                    if (d[i].key === text) {
                        rst = d[i];
                        break;
                    }
                } else {
                    if (d[i].name.indexOf(text) === 0) {
                        rst = d[i];
                        break;
                    }
                }
            }
            return rst;
        },
        getCache: function (expire) {
            var rst = null;
            if (!_st || !expire)
                return null;

            rst = _st.getItem('__cityselector__') || null;
            try {
                rst = JSON.parse(rst);
                if (expire === true || rst.time && rst.data && (+new Date - rst.time) / 1000 < expire) {
                    return rst.data;
                }
            } catch (e) {
            }
            return rst;
        },
        setCache: function (d) {
            var time = +new Date(), rst = {time: time, data: d};
            if (_st) {
                _st.setItem('__cityselector__', JSON.stringify(rst));
            }
        },
        getData: function (cache, url, succ, err) {
            var self = this, data = this.getCache(cache);
            if (data) {
               succ.call(null, data); 
            }
            $.ajax({
                url: url,
                dataType: 'json',
                success: function () {
                    self.setCache(arguments[0]);
                    succ.apply(null, arguments);
                },
                error: function () {
                    err.apply(null, arguments);
                }
            });
        }
    };

    var Intercept = {
        init: function (me) {
            this._list = {};
            this.bind = me;
        },
        push: function (key, action) {
            this._list[key] = action;
        },
        attach: function () {
            if (typeof(this._list[arguments[0]]) !== 'function')
                return arguments[1];
            return this._list[arguments[0]].apply(this.bind, Array.prototype.slice.call(arguments, 1));
        }
    }

    function CitySelector (dom, config) {
        if (!config.dataSource) {
            throw 'dataSource is not set.';
        }
        var self = this, dataSource = config.dataSource,
            args = [],
            timestamp = dom.data('init');
        self.config = $.extend({}, CitySelector.default, config);
        self.timestamp = timestamp;
        self.target = dom;
        Intercept.init(this);
        if (typeof(dataSource) === 'function') {
            dataSource = dataSource();
        }
        if (typeof(dataSource) === 'string') {
            CS.getData(self.config.cache, self.config.dataSource, function (d) {
                self.target.trigger('cse:ajaxSuccess', d);
                self.dataSource = CS.sort(d);
                self.render();
            }, function () {
                self.target.trigger('cse:ajaxError', arguments);
            });
        } else {
            if (typeof(dataSource.then) === 'function') {
                dataSource.then(function (v) {
                    self.dataSource = CS.sort(v);
                    self.render();
                });
            } else {
                self.dataSource = CS.sort(dataSource);
                self.render();
            }

        }
        setTimeout(function () {
            self.getLocation();
        }, 500);
        
    }

    CitySelector.prototype = {
        constructor: CitySelector,
        render: function (data) {
            var self = this, dataSource = data || self.dataSource, isSearch = !!data,
                sidebar = '', i = 0,
                cate = '', lastCate = null, cateList, tmp = '', strCate = '', city = null, cityName, strCity = '';
            if (!dataSource) {
                throw 'data format is incorrect';
            }
            dataSource.forEach(function (list, i) {
                cate = list.alpha[0] ? list.alpha[0] : '';
                if (lastCate && cate !== lastCate && !isSearch) {
                    strCate += CitySelector.template.CATEGORY.replace(/{category}/g, lastCate.toUpperCase()).replace('@@CITYLIST@@', strCity);
                    strCity = '';
                }
                strCity += CitySelector.template.CITYLIST.replace(/{key}/g, list.key).replace(/{name}/g, list.name);
                lastCate = cate;
            });
            if (!isSearch) {
                strCate += CitySelector.template.CATEGORY.replace(/{category}/g, lastCate.toUpperCase()).replace('@@CITYLIST@@', strCity);
                i = -1;
                while(++i < 26) {
                    cate = String.fromCharCode(65 + i);
                    sidebar += CitySelector.template.SIDEBAR.replace(/{category}/g, cate);
                }
            } else {
                strCate = '<ul class="city-list">' + strCity + '</ul>';
            }
            if (self.dom) {
                self.dom.find('.city-wrap').html(strCate);
                if (isSearch) {
                    self.dom.find('.anchor-list').hide();
                } else 
                    self.dom.find('.anchor-list').show();
            } else {
                self.dom = $(CitySelector.template.MAIN.replace('@@CATEGORY@@', strCate).replace('@@SIDEBAR@@', sidebar));
                self.dom.attr('id', 'cityselector-' + self.timestamp);
                $('body').append(self.dom);

                self.target.trigger('cse:initialized');

                self.dom.find('#search').on('input', function (e) {
                    var v = $(this).val();
                    self.search(v);
                });
                self.dom.on('click', '.city-list-item', function (e) {
                    self.pick($(this).attr('data'));
                });
                self.dom.on('click', '#current', function (e) {
                    if (self.currentLocation)
                        self.select(self.currentLocation);
                });
                self.target.on('click', function (e) {
                    self.open();
                });
                if ("ontouchend" in document) {
                    self.dom.on('touchstart', '.anchor-list li', function (e) {
                        var cate = $(this).text();
                        if (self.currentPosition !== cate) {
                            self.currentPosition = cate;
                            self.scrollTo(cate);
                        }
                        $(this).parent().addClass('active');
                        self.dom.find('.item-tip').show();
                        e.preventDefault();
                    });
                    self.dom.on('touchmove', '.anchor-list li', function (e) {
                        var myLocation = e.originalEvent.changedTouches[0], cate = '',
                            current = document.elementFromPoint(myLocation.clientX, myLocation.clientY);
                        if ($(current).parent().hasClass('anchor-list')) {
                            cate = $(current).text();
                            if (self.currentPosition !== cate) {
                                self.currentPosition = cate;
                                self.scrollTo(cate);
                            }
                        }
                        e.preventDefault();
                    });
                    self.dom.on('touchend', '.anchor-list li', function (e) {
                        $(this).parent().removeClass('active');
                        self.dom.find('.item-tip').hide();
                    });
                } else {
                    self.dom.on('click', '.anchor-list li', function (e) {
                        //console.log($(this).text());
                        var cate = $(this).text();
                        if (self.currentPosition !== cate) {
                            self.currentPosition = cate;
                            self.scrollTo(cate);
                        }
                        $(this).parent().addClass('active');
                        self.dom.find('.item-tip').show();
                        e.preventDefault();
                    });
                }
            }
        },
        open: function () {
            this.originalTitle = document.title;
            document.title = this.config.title;
            this.dom.show().find('#search').val('');
            this.target.trigger('cse:opened');
            this.render();
        },
        close: function () {
            if (this.originalTitle)
                document.title = this.originalTitle;
            if (this.dom)
                this.dom.hide();
            this.target.trigger('cse:closed');
        },
        search: function (text) {
            var self = this, data = self.dataSource;
            text = text ? text.toLowerCase() : text;
            data = !text ? data : data.filter(function (city) {
                return city.key === text || city.initial.indexOf(text) === 0 || city.spell.indexOf(text) === 0 || city.name.indexOf(text) !== -1;
            });
            this.render(text ? data : undefined);
        },
        pick: function (v) {
            var self = this;
            v = CS.find(self.dataSource, v, true);
            if (v === null)
                return;
            if (!self.current || self.current.key !== v.key)
                self.target.trigger('cse:changed', v);

            self.current = v;
            self.target.html(v.name);
            self.close();
        },
        select: function (v) {
            var self = this;
            if (typeof(v) === 'string') {
                if (!self.dataSource) {
                    setTimeout(function () {
                        self.select(v);
                    }, 500);
                } else
                    v = CS.find(self.dataSource, v);
            }
            if (v === null)
                return;
            if (!self.current || self.current.key !== v.key)
                self.target.trigger('cse:changed', v);

            self.current = v;
            self.target.html(v.name);
            self.close();
        },
        scrollTo: function (cate) {
            var wrap = this.dom.find('.city-wrap'),
                cateDom = this.dom.find('#category-' + cate),
                padding = this.dom.find('.search').height() + this.dom.find('.city-local').height();
            if (cateDom.length) {
                wrap[0].scrollTop = wrap[0].scrollTop - padding + cateDom.offset().top;
                this.dom.find('.item-tip').html(cate);
            }
        },
        intercept: function (key, cb) {
            Intercept.push(key, cb);
        },
        getLocation: function (cb) {
            var data = Intercept.attach('csi:getLocation'),
                self = this;
            if (data) {
                if (typeof(data) === 'string') {
                    data = {city: data};
                }
                self.select(data.city);
                self.setLocation();
                if (typeof(cb) === 'function') {
                    cb(self.current);
                }
            } else if (data === false) {
                // Intercepted
            } else {
                var head = document.getElementsByTagName("head")[0] || document.documentElement,
                    baseElement = head.getElementsByTagName("base")[0],
                    node = document.createElement("script");
                node.charset = "utf-8";
                node.async = true;
                node.src = 'http://int.dpool.sina.com.cn/iplookup/iplookup.php?format=js';
                node.onload = function () {
                    var data = window.remote_ip_info;
                    delete window['remote_ip_info'];
                    self.select(data.province);
                    self.setLocation();
                    if (typeof(cb) === 'function') {
                        cb(self.current);
                    }
                };
                baseElement ? head.insertBefore(node, baseElement) : head.appendChild(node);
            }
        },
        setLocation: function (location) {
            var self = this;
            location = location || self.current;
            self.currentLocation = location;
            if (self.dom) {
                if (!self.current) {
                    self.dom.find('#current').html('定位失败');
                } else 
                    self.dom.find('#current').html(self.current.name);
            }
            else 
                self.target.one('cse:initialized', function () {
                    self.dom.find('#current').html(self.current.name);
                });
        }
    };

    CitySelector.template = {
        MAIN: '<div class="cityselector"><div class="search"><input id="search" type="text" placeholder="请输入城市名称或拼音首字母" /></div><div class="city-local">当前定位城市: <span id="current">定位中...</span></div><div class="city-wrap">@@CATEGORY@@</div><ul class="anchor-list">@@SIDEBAR@@</ul><div class="item-tip"></div></div>',
        SIDEBAR: '<li><a href="javascript:;">{category}</a></li>',
        CATEGORY: '<p class="city-title" id="category-{category}">{category}</p><ul class="city-list">@@CITYLIST@@</ul>',
        CITYLIST: '<li class="city-list-item" data="{key}"><span>{name}</span></li>'
    };

    CitySelector.default = {
        title: '城市选择',
        cache: 3600 * 24 * 30
    };

    var _inst = {};

    $.fn.cityselector = function () {
        if (arguments.length === 0 || typeof(arguments[0]) === 'object') {
            var t = +new Date();
            if (!this.data('init')) {
                this.data('init', t);
                _inst[t] = new CitySelector(this, arguments[0]);
            }
        } else if (typeof(arguments[0] === 'string')) {
            var inst = this.data('init');
            if (!inst) {
                throw 'cityselector is not initialized';
            }
            inst = _inst[this.data('init')];
            if (typeof(inst[arguments[0]]) === 'function') {
                inst[arguments[0]].apply(inst, Array.prototype.slice.call(arguments, 1));
            } else {
                throw arguments[0] + ' is not implemented.';
            }
        }
    };
})(window.Zepto || window.jQuery);