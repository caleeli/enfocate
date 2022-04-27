
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35730/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        if (value === null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function afterUpdate(fn) {
        get_current_component().$$.after_update.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            // @ts-ignore
            callbacks.slice().forEach(fn => fn.call(this, event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function tick() {
        schedule_update();
        return resolved_promise;
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.46.6' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const translations = {
        inactive: "Inactiva",
        paused: "Pausada",
        active: "Activa",
        completed: "Completada",
        canceled: "Cancelada",
        cancel: "Cancelar",
        start: "Iniciar",
        pause: "Pausar",
        continue: "Continuar",
        time: "Tiempo",
        add: "Añadir",
        edit: "Editar",
    };

    function translation(text) {
        return translations[text] || text;
    }

    /**
     * @typedef {Object} WrappedComponent Object returned by the `wrap` method
     * @property {SvelteComponent} component - Component to load (this is always asynchronous)
     * @property {RoutePrecondition[]} [conditions] - Route pre-conditions to validate
     * @property {Object} [props] - Optional dictionary of static props
     * @property {Object} [userData] - Optional user data dictionary
     * @property {bool} _sveltesparouter - Internal flag; always set to true
     */

    /**
     * @callback AsyncSvelteComponent
     * @returns {Promise<SvelteComponent>} Returns a Promise that resolves with a Svelte component
     */

    /**
     * @callback RoutePrecondition
     * @param {RouteDetail} detail - Route detail object
     * @returns {boolean|Promise<boolean>} If the callback returns a false-y value, it's interpreted as the precondition failed, so it aborts loading the component (and won't process other pre-condition callbacks)
     */

    /**
     * @typedef {Object} WrapOptions Options object for the call to `wrap`
     * @property {SvelteComponent} [component] - Svelte component to load (this is incompatible with `asyncComponent`)
     * @property {AsyncSvelteComponent} [asyncComponent] - Function that returns a Promise that fulfills with a Svelte component (e.g. `{asyncComponent: () => import('Foo.svelte')}`)
     * @property {SvelteComponent} [loadingComponent] - Svelte component to be displayed while the async route is loading (as a placeholder); when unset or false-y, no component is shown while component
     * @property {object} [loadingParams] - Optional dictionary passed to the `loadingComponent` component as params (for an exported prop called `params`)
     * @property {object} [userData] - Optional object that will be passed to events such as `routeLoading`, `routeLoaded`, `conditionsFailed`
     * @property {object} [props] - Optional key-value dictionary of static props that will be passed to the component. The props are expanded with {...props}, so the key in the dictionary becomes the name of the prop.
     * @property {RoutePrecondition[]|RoutePrecondition} [conditions] - Route pre-conditions to add, which will be executed in order
     */

    /**
     * Wraps a component to enable multiple capabilities:
     * 1. Using dynamically-imported component, with (e.g. `{asyncComponent: () => import('Foo.svelte')}`), which also allows bundlers to do code-splitting.
     * 2. Adding route pre-conditions (e.g. `{conditions: [...]}`)
     * 3. Adding static props that are passed to the component
     * 4. Adding custom userData, which is passed to route events (e.g. route loaded events) or to route pre-conditions (e.g. `{userData: {foo: 'bar}}`)
     * 
     * @param {WrapOptions} args - Arguments object
     * @returns {WrappedComponent} Wrapped component
     */
    function wrap$1(args) {
        if (!args) {
            throw Error('Parameter args is required')
        }

        // We need to have one and only one of component and asyncComponent
        // This does a "XNOR"
        if (!args.component == !args.asyncComponent) {
            throw Error('One and only one of component and asyncComponent is required')
        }

        // If the component is not async, wrap it into a function returning a Promise
        if (args.component) {
            args.asyncComponent = () => Promise.resolve(args.component);
        }

        // Parameter asyncComponent and each item of conditions must be functions
        if (typeof args.asyncComponent != 'function') {
            throw Error('Parameter asyncComponent must be a function')
        }
        if (args.conditions) {
            // Ensure it's an array
            if (!Array.isArray(args.conditions)) {
                args.conditions = [args.conditions];
            }
            for (let i = 0; i < args.conditions.length; i++) {
                if (!args.conditions[i] || typeof args.conditions[i] != 'function') {
                    throw Error('Invalid parameter conditions[' + i + ']')
                }
            }
        }

        // Check if we have a placeholder component
        if (args.loadingComponent) {
            args.asyncComponent.loading = args.loadingComponent;
            args.asyncComponent.loadingParams = args.loadingParams || undefined;
        }

        // Returns an object that contains all the functions to execute too
        // The _sveltesparouter flag is to confirm the object was created by this router
        const obj = {
            component: args.asyncComponent,
            userData: args.userData,
            conditions: (args.conditions && args.conditions.length) ? args.conditions : undefined,
            props: (args.props && Object.keys(args.props).length) ? args.props : {},
            _sveltesparouter: true
        };

        return obj
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
    }

    function parse(str, loose) {
    	if (str instanceof RegExp) return { keys:false, pattern:str };
    	var c, o, tmp, ext, keys=[], pattern='', arr = str.split('/');
    	arr[0] || arr.shift();

    	while (tmp = arr.shift()) {
    		c = tmp[0];
    		if (c === '*') {
    			keys.push('wild');
    			pattern += '/(.*)';
    		} else if (c === ':') {
    			o = tmp.indexOf('?', 1);
    			ext = tmp.indexOf('.', 1);
    			keys.push( tmp.substring(1, !!~o ? o : !!~ext ? ext : tmp.length) );
    			pattern += !!~o && !~ext ? '(?:/([^/]+?))?' : '/([^/]+?)';
    			if (!!~ext) pattern += (!!~o ? '?' : '') + '\\' + tmp.substring(ext);
    		} else {
    			pattern += '/' + tmp;
    		}
    	}

    	return {
    		keys: keys,
    		pattern: new RegExp('^' + pattern + (loose ? '(?=$|\/)' : '\/?$'), 'i')
    	};
    }

    /* node_modules/svelte-spa-router/Router.svelte generated by Svelte v3.46.6 */

    const { Error: Error_1, Object: Object_1, console: console_1$2 } = globals;

    // (251:0) {:else}
    function create_else_block$1(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	const switch_instance_spread_levels = [/*props*/ ctx[2]];
    	var switch_value = /*component*/ ctx[0];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    		switch_instance.$on("routeEvent", /*routeEvent_handler_1*/ ctx[7]);
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*props*/ 4)
    			? get_spread_update(switch_instance_spread_levels, [get_spread_object(/*props*/ ctx[2])])
    			: {};

    			if (switch_value !== (switch_value = /*component*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					switch_instance.$on("routeEvent", /*routeEvent_handler_1*/ ctx[7]);
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(251:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (244:0) {#if componentParams}
    function create_if_block$3(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	const switch_instance_spread_levels = [{ params: /*componentParams*/ ctx[1] }, /*props*/ ctx[2]];
    	var switch_value = /*component*/ ctx[0];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    		switch_instance.$on("routeEvent", /*routeEvent_handler*/ ctx[6]);
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*componentParams, props*/ 6)
    			? get_spread_update(switch_instance_spread_levels, [
    					dirty & /*componentParams*/ 2 && { params: /*componentParams*/ ctx[1] },
    					dirty & /*props*/ 4 && get_spread_object(/*props*/ ctx[2])
    				])
    			: {};

    			if (switch_value !== (switch_value = /*component*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					switch_instance.$on("routeEvent", /*routeEvent_handler*/ ctx[6]);
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(244:0) {#if componentParams}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$3, create_else_block$1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*componentParams*/ ctx[1]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error_1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function wrap(component, userData, ...conditions) {
    	// Use the new wrap method and show a deprecation warning
    	// eslint-disable-next-line no-console
    	console.warn('Method `wrap` from `svelte-spa-router` is deprecated and will be removed in a future version. Please use `svelte-spa-router/wrap` instead. See http://bit.ly/svelte-spa-router-upgrading');

    	return wrap$1({ component, userData, conditions });
    }

    /**
     * @typedef {Object} Location
     * @property {string} location - Location (page/view), for example `/book`
     * @property {string} [querystring] - Querystring from the hash, as a string not parsed
     */
    /**
     * Returns the current location from the hash.
     *
     * @returns {Location} Location object
     * @private
     */
    function getLocation() {
    	const hashPosition = window.location.href.indexOf('#/');

    	let location = hashPosition > -1
    	? window.location.href.substr(hashPosition + 1)
    	: '/';

    	// Check if there's a querystring
    	const qsPosition = location.indexOf('?');

    	let querystring = '';

    	if (qsPosition > -1) {
    		querystring = location.substr(qsPosition + 1);
    		location = location.substr(0, qsPosition);
    	}

    	return { location, querystring };
    }

    const loc = readable(null, // eslint-disable-next-line prefer-arrow-callback
    function start(set) {
    	set(getLocation());

    	const update = () => {
    		set(getLocation());
    	};

    	window.addEventListener('hashchange', update, false);

    	return function stop() {
    		window.removeEventListener('hashchange', update, false);
    	};
    });

    const location = derived(loc, $loc => $loc.location);
    const querystring = derived(loc, $loc => $loc.querystring);
    const params = writable(undefined);

    async function push(location) {
    	if (!location || location.length < 1 || location.charAt(0) != '/' && location.indexOf('#/') !== 0) {
    		throw Error('Invalid parameter location');
    	}

    	// Execute this code when the current call stack is complete
    	await tick();

    	// Note: this will include scroll state in history even when restoreScrollState is false
    	history.replaceState(
    		{
    			...history.state,
    			__svelte_spa_router_scrollX: window.scrollX,
    			__svelte_spa_router_scrollY: window.scrollY
    		},
    		undefined,
    		undefined
    	);

    	window.location.hash = (location.charAt(0) == '#' ? '' : '#') + location;
    }

    async function pop() {
    	// Execute this code when the current call stack is complete
    	await tick();

    	window.history.back();
    }

    async function replace(location) {
    	if (!location || location.length < 1 || location.charAt(0) != '/' && location.indexOf('#/') !== 0) {
    		throw Error('Invalid parameter location');
    	}

    	// Execute this code when the current call stack is complete
    	await tick();

    	const dest = (location.charAt(0) == '#' ? '' : '#') + location;

    	try {
    		const newState = { ...history.state };
    		delete newState['__svelte_spa_router_scrollX'];
    		delete newState['__svelte_spa_router_scrollY'];
    		window.history.replaceState(newState, undefined, dest);
    	} catch(e) {
    		// eslint-disable-next-line no-console
    		console.warn('Caught exception while replacing the current page. If you\'re running this in the Svelte REPL, please note that the `replace` method might not work in this environment.');
    	}

    	// The method above doesn't trigger the hashchange event, so let's do that manually
    	window.dispatchEvent(new Event('hashchange'));
    }

    function link(node, opts) {
    	opts = linkOpts(opts);

    	// Only apply to <a> tags
    	if (!node || !node.tagName || node.tagName.toLowerCase() != 'a') {
    		throw Error('Action "link" can only be used with <a> tags');
    	}

    	updateLink(node, opts);

    	return {
    		update(updated) {
    			updated = linkOpts(updated);
    			updateLink(node, updated);
    		}
    	};
    }

    // Internal function used by the link function
    function updateLink(node, opts) {
    	let href = opts.href || node.getAttribute('href');

    	// Destination must start with '/' or '#/'
    	if (href && href.charAt(0) == '/') {
    		// Add # to the href attribute
    		href = '#' + href;
    	} else if (!href || href.length < 2 || href.slice(0, 2) != '#/') {
    		throw Error('Invalid value for "href" attribute: ' + href);
    	}

    	node.setAttribute('href', href);

    	node.addEventListener('click', event => {
    		// Prevent default anchor onclick behaviour
    		event.preventDefault();

    		if (!opts.disabled) {
    			scrollstateHistoryHandler(event.currentTarget.getAttribute('href'));
    		}
    	});
    }

    // Internal function that ensures the argument of the link action is always an object
    function linkOpts(val) {
    	if (val && typeof val == 'string') {
    		return { href: val };
    	} else {
    		return val || {};
    	}
    }

    /**
     * The handler attached to an anchor tag responsible for updating the
     * current history state with the current scroll state
     *
     * @param {string} href - Destination
     */
    function scrollstateHistoryHandler(href) {
    	// Setting the url (3rd arg) to href will break clicking for reasons, so don't try to do that
    	history.replaceState(
    		{
    			...history.state,
    			__svelte_spa_router_scrollX: window.scrollX,
    			__svelte_spa_router_scrollY: window.scrollY
    		},
    		undefined,
    		undefined
    	);

    	// This will force an update as desired, but this time our scroll state will be attached
    	window.location.hash = href;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Router', slots, []);
    	let { routes = {} } = $$props;
    	let { prefix = '' } = $$props;
    	let { restoreScrollState = false } = $$props;

    	/**
     * Container for a route: path, component
     */
    	class RouteItem {
    		/**
     * Initializes the object and creates a regular expression from the path, using regexparam.
     *
     * @param {string} path - Path to the route (must start with '/' or '*')
     * @param {SvelteComponent|WrappedComponent} component - Svelte component for the route, optionally wrapped
     */
    		constructor(path, component) {
    			if (!component || typeof component != 'function' && (typeof component != 'object' || component._sveltesparouter !== true)) {
    				throw Error('Invalid component object');
    			}

    			// Path must be a regular or expression, or a string starting with '/' or '*'
    			if (!path || typeof path == 'string' && (path.length < 1 || path.charAt(0) != '/' && path.charAt(0) != '*') || typeof path == 'object' && !(path instanceof RegExp)) {
    				throw Error('Invalid value for "path" argument - strings must start with / or *');
    			}

    			const { pattern, keys } = parse(path);
    			this.path = path;

    			// Check if the component is wrapped and we have conditions
    			if (typeof component == 'object' && component._sveltesparouter === true) {
    				this.component = component.component;
    				this.conditions = component.conditions || [];
    				this.userData = component.userData;
    				this.props = component.props || {};
    			} else {
    				// Convert the component to a function that returns a Promise, to normalize it
    				this.component = () => Promise.resolve(component);

    				this.conditions = [];
    				this.props = {};
    			}

    			this._pattern = pattern;
    			this._keys = keys;
    		}

    		/**
     * Checks if `path` matches the current route.
     * If there's a match, will return the list of parameters from the URL (if any).
     * In case of no match, the method will return `null`.
     *
     * @param {string} path - Path to test
     * @returns {null|Object.<string, string>} List of paramters from the URL if there's a match, or `null` otherwise.
     */
    		match(path) {
    			// If there's a prefix, check if it matches the start of the path.
    			// If not, bail early, else remove it before we run the matching.
    			if (prefix) {
    				if (typeof prefix == 'string') {
    					if (path.startsWith(prefix)) {
    						path = path.substr(prefix.length) || '/';
    					} else {
    						return null;
    					}
    				} else if (prefix instanceof RegExp) {
    					const match = path.match(prefix);

    					if (match && match[0]) {
    						path = path.substr(match[0].length) || '/';
    					} else {
    						return null;
    					}
    				}
    			}

    			// Check if the pattern matches
    			const matches = this._pattern.exec(path);

    			if (matches === null) {
    				return null;
    			}

    			// If the input was a regular expression, this._keys would be false, so return matches as is
    			if (this._keys === false) {
    				return matches;
    			}

    			const out = {};
    			let i = 0;

    			while (i < this._keys.length) {
    				// In the match parameters, URL-decode all values
    				try {
    					out[this._keys[i]] = decodeURIComponent(matches[i + 1] || '') || null;
    				} catch(e) {
    					out[this._keys[i]] = null;
    				}

    				i++;
    			}

    			return out;
    		}

    		/**
     * Dictionary with route details passed to the pre-conditions functions, as well as the `routeLoading`, `routeLoaded` and `conditionsFailed` events
     * @typedef {Object} RouteDetail
     * @property {string|RegExp} route - Route matched as defined in the route definition (could be a string or a reguar expression object)
     * @property {string} location - Location path
     * @property {string} querystring - Querystring from the hash
     * @property {object} [userData] - Custom data passed by the user
     * @property {SvelteComponent} [component] - Svelte component (only in `routeLoaded` events)
     * @property {string} [name] - Name of the Svelte component (only in `routeLoaded` events)
     */
    		/**
     * Executes all conditions (if any) to control whether the route can be shown. Conditions are executed in the order they are defined, and if a condition fails, the following ones aren't executed.
     * 
     * @param {RouteDetail} detail - Route detail
     * @returns {boolean} Returns true if all the conditions succeeded
     */
    		async checkConditions(detail) {
    			for (let i = 0; i < this.conditions.length; i++) {
    				if (!await this.conditions[i](detail)) {
    					return false;
    				}
    			}

    			return true;
    		}
    	}

    	// Set up all routes
    	const routesList = [];

    	if (routes instanceof Map) {
    		// If it's a map, iterate on it right away
    		routes.forEach((route, path) => {
    			routesList.push(new RouteItem(path, route));
    		});
    	} else {
    		// We have an object, so iterate on its own properties
    		Object.keys(routes).forEach(path => {
    			routesList.push(new RouteItem(path, routes[path]));
    		});
    	}

    	// Props for the component to render
    	let component = null;

    	let componentParams = null;
    	let props = {};

    	// Event dispatcher from Svelte
    	const dispatch = createEventDispatcher();

    	// Just like dispatch, but executes on the next iteration of the event loop
    	async function dispatchNextTick(name, detail) {
    		// Execute this code when the current call stack is complete
    		await tick();

    		dispatch(name, detail);
    	}

    	// If this is set, then that means we have popped into this var the state of our last scroll position
    	let previousScrollState = null;

    	let popStateChanged = null;

    	if (restoreScrollState) {
    		popStateChanged = event => {
    			// If this event was from our history.replaceState, event.state will contain
    			// our scroll history. Otherwise, event.state will be null (like on forward
    			// navigation)
    			if (event.state && event.state.__svelte_spa_router_scrollY) {
    				previousScrollState = event.state;
    			} else {
    				previousScrollState = null;
    			}
    		};

    		// This is removed in the destroy() invocation below
    		window.addEventListener('popstate', popStateChanged);

    		afterUpdate(() => {
    			// If this exists, then this is a back navigation: restore the scroll position
    			if (previousScrollState) {
    				window.scrollTo(previousScrollState.__svelte_spa_router_scrollX, previousScrollState.__svelte_spa_router_scrollY);
    			} else {
    				// Otherwise this is a forward navigation: scroll to top
    				window.scrollTo(0, 0);
    			}
    		});
    	}

    	// Always have the latest value of loc
    	let lastLoc = null;

    	// Current object of the component loaded
    	let componentObj = null;

    	// Handle hash change events
    	// Listen to changes in the $loc store and update the page
    	// Do not use the $: syntax because it gets triggered by too many things
    	const unsubscribeLoc = loc.subscribe(async newLoc => {
    		lastLoc = newLoc;

    		// Find a route matching the location
    		let i = 0;

    		while (i < routesList.length) {
    			const match = routesList[i].match(newLoc.location);

    			if (!match) {
    				i++;
    				continue;
    			}

    			const detail = {
    				route: routesList[i].path,
    				location: newLoc.location,
    				querystring: newLoc.querystring,
    				userData: routesList[i].userData,
    				params: match && typeof match == 'object' && Object.keys(match).length
    				? match
    				: null
    			};

    			// Check if the route can be loaded - if all conditions succeed
    			if (!await routesList[i].checkConditions(detail)) {
    				// Don't display anything
    				$$invalidate(0, component = null);

    				componentObj = null;

    				// Trigger an event to notify the user, then exit
    				dispatchNextTick('conditionsFailed', detail);

    				return;
    			}

    			// Trigger an event to alert that we're loading the route
    			// We need to clone the object on every event invocation so we don't risk the object to be modified in the next tick
    			dispatchNextTick('routeLoading', Object.assign({}, detail));

    			// If there's a component to show while we're loading the route, display it
    			const obj = routesList[i].component;

    			// Do not replace the component if we're loading the same one as before, to avoid the route being unmounted and re-mounted
    			if (componentObj != obj) {
    				if (obj.loading) {
    					$$invalidate(0, component = obj.loading);
    					componentObj = obj;
    					$$invalidate(1, componentParams = obj.loadingParams);
    					$$invalidate(2, props = {});

    					// Trigger the routeLoaded event for the loading component
    					// Create a copy of detail so we don't modify the object for the dynamic route (and the dynamic route doesn't modify our object too)
    					dispatchNextTick('routeLoaded', Object.assign({}, detail, {
    						component,
    						name: component.name,
    						params: componentParams
    					}));
    				} else {
    					$$invalidate(0, component = null);
    					componentObj = null;
    				}

    				// Invoke the Promise
    				const loaded = await obj();

    				// Now that we're here, after the promise resolved, check if we still want this component, as the user might have navigated to another page in the meanwhile
    				if (newLoc != lastLoc) {
    					// Don't update the component, just exit
    					return;
    				}

    				// If there is a "default" property, which is used by async routes, then pick that
    				$$invalidate(0, component = loaded && loaded.default || loaded);

    				componentObj = obj;
    			}

    			// Set componentParams only if we have a match, to avoid a warning similar to `<Component> was created with unknown prop 'params'`
    			// Of course, this assumes that developers always add a "params" prop when they are expecting parameters
    			if (match && typeof match == 'object' && Object.keys(match).length) {
    				$$invalidate(1, componentParams = match);
    			} else {
    				$$invalidate(1, componentParams = null);
    			}

    			// Set static props, if any
    			$$invalidate(2, props = routesList[i].props);

    			// Dispatch the routeLoaded event then exit
    			// We need to clone the object on every event invocation so we don't risk the object to be modified in the next tick
    			dispatchNextTick('routeLoaded', Object.assign({}, detail, {
    				component,
    				name: component.name,
    				params: componentParams
    			})).then(() => {
    				params.set(componentParams);
    			});

    			return;
    		}

    		// If we're still here, there was no match, so show the empty component
    		$$invalidate(0, component = null);

    		componentObj = null;
    		params.set(undefined);
    	});

    	onDestroy(() => {
    		unsubscribeLoc();
    		popStateChanged && window.removeEventListener('popstate', popStateChanged);
    	});

    	const writable_props = ['routes', 'prefix', 'restoreScrollState'];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$2.warn(`<Router> was created with unknown prop '${key}'`);
    	});

    	function routeEvent_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	function routeEvent_handler_1(event) {
    		bubble.call(this, $$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ('routes' in $$props) $$invalidate(3, routes = $$props.routes);
    		if ('prefix' in $$props) $$invalidate(4, prefix = $$props.prefix);
    		if ('restoreScrollState' in $$props) $$invalidate(5, restoreScrollState = $$props.restoreScrollState);
    	};

    	$$self.$capture_state = () => ({
    		readable,
    		writable,
    		derived,
    		tick,
    		_wrap: wrap$1,
    		wrap,
    		getLocation,
    		loc,
    		location,
    		querystring,
    		params,
    		push,
    		pop,
    		replace,
    		link,
    		updateLink,
    		linkOpts,
    		scrollstateHistoryHandler,
    		onDestroy,
    		createEventDispatcher,
    		afterUpdate,
    		parse,
    		routes,
    		prefix,
    		restoreScrollState,
    		RouteItem,
    		routesList,
    		component,
    		componentParams,
    		props,
    		dispatch,
    		dispatchNextTick,
    		previousScrollState,
    		popStateChanged,
    		lastLoc,
    		componentObj,
    		unsubscribeLoc
    	});

    	$$self.$inject_state = $$props => {
    		if ('routes' in $$props) $$invalidate(3, routes = $$props.routes);
    		if ('prefix' in $$props) $$invalidate(4, prefix = $$props.prefix);
    		if ('restoreScrollState' in $$props) $$invalidate(5, restoreScrollState = $$props.restoreScrollState);
    		if ('component' in $$props) $$invalidate(0, component = $$props.component);
    		if ('componentParams' in $$props) $$invalidate(1, componentParams = $$props.componentParams);
    		if ('props' in $$props) $$invalidate(2, props = $$props.props);
    		if ('previousScrollState' in $$props) previousScrollState = $$props.previousScrollState;
    		if ('popStateChanged' in $$props) popStateChanged = $$props.popStateChanged;
    		if ('lastLoc' in $$props) lastLoc = $$props.lastLoc;
    		if ('componentObj' in $$props) componentObj = $$props.componentObj;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*restoreScrollState*/ 32) {
    			// Update history.scrollRestoration depending on restoreScrollState
    			history.scrollRestoration = restoreScrollState ? 'manual' : 'auto';
    		}
    	};

    	return [
    		component,
    		componentParams,
    		props,
    		routes,
    		prefix,
    		restoreScrollState,
    		routeEvent_handler,
    		routeEvent_handler_1
    	];
    }

    class Router extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {
    			routes: 3,
    			prefix: 4,
    			restoreScrollState: 5
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Router",
    			options,
    			id: create_fragment$5.name
    		});
    	}

    	get routes() {
    		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set routes(value) {
    		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get prefix() {
    		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set prefix(value) {
    		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get restoreScrollState() {
    		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set restoreScrollState(value) {
    		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /*! Capacitor: https://capacitorjs.com/ - MIT License */
    const createCapacitorPlatforms = (win) => {
        const defaultPlatformMap = new Map();
        defaultPlatformMap.set('web', { name: 'web' });
        const capPlatforms = win.CapacitorPlatforms || {
            currentPlatform: { name: 'web' },
            platforms: defaultPlatformMap,
        };
        const addPlatform = (name, platform) => {
            capPlatforms.platforms.set(name, platform);
        };
        const setPlatform = (name) => {
            if (capPlatforms.platforms.has(name)) {
                capPlatforms.currentPlatform = capPlatforms.platforms.get(name);
            }
        };
        capPlatforms.addPlatform = addPlatform;
        capPlatforms.setPlatform = setPlatform;
        return capPlatforms;
    };
    const initPlatforms = (win) => (win.CapacitorPlatforms = createCapacitorPlatforms(win));
    /**
     * @deprecated Set `CapacitorCustomPlatform` on the window object prior to runtime executing in the web app instead
     */
    const CapacitorPlatforms = /*#__PURE__*/ initPlatforms((typeof globalThis !== 'undefined'
        ? globalThis
        : typeof self !== 'undefined'
            ? self
            : typeof window !== 'undefined'
                ? window
                : typeof global !== 'undefined'
                    ? global
                    : {}));
    /**
     * @deprecated Set `CapacitorCustomPlatform` on the window object prior to runtime executing in the web app instead
     */
    CapacitorPlatforms.addPlatform;
    /**
     * @deprecated Set `CapacitorCustomPlatform` on the window object prior to runtime executing in the web app instead
     */
    CapacitorPlatforms.setPlatform;

    var ExceptionCode;
    (function (ExceptionCode) {
        /**
         * API is not implemented.
         *
         * This usually means the API can't be used because it is not implemented for
         * the current platform.
         */
        ExceptionCode["Unimplemented"] = "UNIMPLEMENTED";
        /**
         * API is not available.
         *
         * This means the API can't be used right now because:
         *   - it is currently missing a prerequisite, such as network connectivity
         *   - it requires a particular platform or browser version
         */
        ExceptionCode["Unavailable"] = "UNAVAILABLE";
    })(ExceptionCode || (ExceptionCode = {}));
    class CapacitorException extends Error {
        constructor(message, code) {
            super(message);
            this.message = message;
            this.code = code;
        }
    }
    const getPlatformId = (win) => {
        var _a, _b;
        if (win === null || win === void 0 ? void 0 : win.androidBridge) {
            return 'android';
        }
        else if ((_b = (_a = win === null || win === void 0 ? void 0 : win.webkit) === null || _a === void 0 ? void 0 : _a.messageHandlers) === null || _b === void 0 ? void 0 : _b.bridge) {
            return 'ios';
        }
        else {
            return 'web';
        }
    };

    const createCapacitor = (win) => {
        var _a, _b, _c, _d, _e;
        const capCustomPlatform = win.CapacitorCustomPlatform || null;
        const cap = win.Capacitor || {};
        const Plugins = (cap.Plugins = cap.Plugins || {});
        /**
         * @deprecated Use `capCustomPlatform` instead, default functions like registerPlugin will function with the new object.
         */
        const capPlatforms = win.CapacitorPlatforms;
        const defaultGetPlatform = () => {
            return capCustomPlatform !== null
                ? capCustomPlatform.name
                : getPlatformId(win);
        };
        const getPlatform = ((_a = capPlatforms === null || capPlatforms === void 0 ? void 0 : capPlatforms.currentPlatform) === null || _a === void 0 ? void 0 : _a.getPlatform) || defaultGetPlatform;
        const defaultIsNativePlatform = () => getPlatform() !== 'web';
        const isNativePlatform = ((_b = capPlatforms === null || capPlatforms === void 0 ? void 0 : capPlatforms.currentPlatform) === null || _b === void 0 ? void 0 : _b.isNativePlatform) || defaultIsNativePlatform;
        const defaultIsPluginAvailable = (pluginName) => {
            const plugin = registeredPlugins.get(pluginName);
            if (plugin === null || plugin === void 0 ? void 0 : plugin.platforms.has(getPlatform())) {
                // JS implementation available for the current platform.
                return true;
            }
            if (getPluginHeader(pluginName)) {
                // Native implementation available.
                return true;
            }
            return false;
        };
        const isPluginAvailable = ((_c = capPlatforms === null || capPlatforms === void 0 ? void 0 : capPlatforms.currentPlatform) === null || _c === void 0 ? void 0 : _c.isPluginAvailable) ||
            defaultIsPluginAvailable;
        const defaultGetPluginHeader = (pluginName) => { var _a; return (_a = cap.PluginHeaders) === null || _a === void 0 ? void 0 : _a.find(h => h.name === pluginName); };
        const getPluginHeader = ((_d = capPlatforms === null || capPlatforms === void 0 ? void 0 : capPlatforms.currentPlatform) === null || _d === void 0 ? void 0 : _d.getPluginHeader) || defaultGetPluginHeader;
        const handleError = (err) => win.console.error(err);
        const pluginMethodNoop = (_target, prop, pluginName) => {
            return Promise.reject(`${pluginName} does not have an implementation of "${prop}".`);
        };
        const registeredPlugins = new Map();
        const defaultRegisterPlugin = (pluginName, jsImplementations = {}) => {
            const registeredPlugin = registeredPlugins.get(pluginName);
            if (registeredPlugin) {
                console.warn(`Capacitor plugin "${pluginName}" already registered. Cannot register plugins twice.`);
                return registeredPlugin.proxy;
            }
            const platform = getPlatform();
            const pluginHeader = getPluginHeader(pluginName);
            let jsImplementation;
            const loadPluginImplementation = async () => {
                if (!jsImplementation && platform in jsImplementations) {
                    jsImplementation =
                        typeof jsImplementations[platform] === 'function'
                            ? (jsImplementation = await jsImplementations[platform]())
                            : (jsImplementation = jsImplementations[platform]);
                }
                else if (capCustomPlatform !== null &&
                    !jsImplementation &&
                    'web' in jsImplementations) {
                    jsImplementation =
                        typeof jsImplementations['web'] === 'function'
                            ? (jsImplementation = await jsImplementations['web']())
                            : (jsImplementation = jsImplementations['web']);
                }
                return jsImplementation;
            };
            const createPluginMethod = (impl, prop) => {
                var _a, _b;
                if (pluginHeader) {
                    const methodHeader = pluginHeader === null || pluginHeader === void 0 ? void 0 : pluginHeader.methods.find(m => prop === m.name);
                    if (methodHeader) {
                        if (methodHeader.rtype === 'promise') {
                            return (options) => cap.nativePromise(pluginName, prop.toString(), options);
                        }
                        else {
                            return (options, callback) => cap.nativeCallback(pluginName, prop.toString(), options, callback);
                        }
                    }
                    else if (impl) {
                        return (_a = impl[prop]) === null || _a === void 0 ? void 0 : _a.bind(impl);
                    }
                }
                else if (impl) {
                    return (_b = impl[prop]) === null || _b === void 0 ? void 0 : _b.bind(impl);
                }
                else {
                    throw new CapacitorException(`"${pluginName}" plugin is not implemented on ${platform}`, ExceptionCode.Unimplemented);
                }
            };
            const createPluginMethodWrapper = (prop) => {
                let remove;
                const wrapper = (...args) => {
                    const p = loadPluginImplementation().then(impl => {
                        const fn = createPluginMethod(impl, prop);
                        if (fn) {
                            const p = fn(...args);
                            remove = p === null || p === void 0 ? void 0 : p.remove;
                            return p;
                        }
                        else {
                            throw new CapacitorException(`"${pluginName}.${prop}()" is not implemented on ${platform}`, ExceptionCode.Unimplemented);
                        }
                    });
                    if (prop === 'addListener') {
                        p.remove = async () => remove();
                    }
                    return p;
                };
                // Some flair ✨
                wrapper.toString = () => `${prop.toString()}() { [capacitor code] }`;
                Object.defineProperty(wrapper, 'name', {
                    value: prop,
                    writable: false,
                    configurable: false,
                });
                return wrapper;
            };
            const addListener = createPluginMethodWrapper('addListener');
            const removeListener = createPluginMethodWrapper('removeListener');
            const addListenerNative = (eventName, callback) => {
                const call = addListener({ eventName }, callback);
                const remove = async () => {
                    const callbackId = await call;
                    removeListener({
                        eventName,
                        callbackId,
                    }, callback);
                };
                const p = new Promise(resolve => call.then(() => resolve({ remove })));
                p.remove = async () => {
                    console.warn(`Using addListener() without 'await' is deprecated.`);
                    await remove();
                };
                return p;
            };
            const proxy = new Proxy({}, {
                get(_, prop) {
                    switch (prop) {
                        // https://github.com/facebook/react/issues/20030
                        case '$$typeof':
                            return undefined;
                        case 'toJSON':
                            return () => ({});
                        case 'addListener':
                            return pluginHeader ? addListenerNative : addListener;
                        case 'removeListener':
                            return removeListener;
                        default:
                            return createPluginMethodWrapper(prop);
                    }
                },
            });
            Plugins[pluginName] = proxy;
            registeredPlugins.set(pluginName, {
                name: pluginName,
                proxy,
                platforms: new Set([
                    ...Object.keys(jsImplementations),
                    ...(pluginHeader ? [platform] : []),
                ]),
            });
            return proxy;
        };
        const registerPlugin = ((_e = capPlatforms === null || capPlatforms === void 0 ? void 0 : capPlatforms.currentPlatform) === null || _e === void 0 ? void 0 : _e.registerPlugin) || defaultRegisterPlugin;
        // Add in convertFileSrc for web, it will already be available in native context
        if (!cap.convertFileSrc) {
            cap.convertFileSrc = filePath => filePath;
        }
        cap.getPlatform = getPlatform;
        cap.handleError = handleError;
        cap.isNativePlatform = isNativePlatform;
        cap.isPluginAvailable = isPluginAvailable;
        cap.pluginMethodNoop = pluginMethodNoop;
        cap.registerPlugin = registerPlugin;
        cap.Exception = CapacitorException;
        cap.DEBUG = !!cap.DEBUG;
        cap.isLoggingEnabled = !!cap.isLoggingEnabled;
        // Deprecated props
        cap.platform = cap.getPlatform();
        cap.isNative = cap.isNativePlatform();
        return cap;
    };
    const initCapacitorGlobal = (win) => (win.Capacitor = createCapacitor(win));

    const Capacitor$1 = /*#__PURE__*/ initCapacitorGlobal(typeof globalThis !== 'undefined'
        ? globalThis
        : typeof self !== 'undefined'
            ? self
            : typeof window !== 'undefined'
                ? window
                : typeof global !== 'undefined'
                    ? global
                    : {});
    const registerPlugin = Capacitor$1.registerPlugin;
    /**
     * @deprecated Provided for backwards compatibility for Capacitor v2 plugins.
     * Capacitor v3 plugins should import the plugin directly. This "Plugins"
     * export is deprecated in v3, and will be removed in v4.
     */
    Capacitor$1.Plugins;

    /**
     * Base class web plugins should extend.
     */
    class WebPlugin {
        constructor(config) {
            this.listeners = {};
            this.windowListeners = {};
            if (config) {
                // TODO: add link to upgrade guide
                console.warn(`Capacitor WebPlugin "${config.name}" config object was deprecated in v3 and will be removed in v4.`);
                this.config = config;
            }
        }
        addListener(eventName, listenerFunc) {
            const listeners = this.listeners[eventName];
            if (!listeners) {
                this.listeners[eventName] = [];
            }
            this.listeners[eventName].push(listenerFunc);
            // If we haven't added a window listener for this event and it requires one,
            // go ahead and add it
            const windowListener = this.windowListeners[eventName];
            if (windowListener && !windowListener.registered) {
                this.addWindowListener(windowListener);
            }
            const remove = async () => this.removeListener(eventName, listenerFunc);
            const p = Promise.resolve({ remove });
            Object.defineProperty(p, 'remove', {
                value: async () => {
                    console.warn(`Using addListener() without 'await' is deprecated.`);
                    await remove();
                },
            });
            return p;
        }
        async removeAllListeners() {
            this.listeners = {};
            for (const listener in this.windowListeners) {
                this.removeWindowListener(this.windowListeners[listener]);
            }
            this.windowListeners = {};
        }
        notifyListeners(eventName, data) {
            const listeners = this.listeners[eventName];
            if (listeners) {
                listeners.forEach(listener => listener(data));
            }
        }
        hasListeners(eventName) {
            return !!this.listeners[eventName].length;
        }
        registerWindowListener(windowEventName, pluginEventName) {
            this.windowListeners[pluginEventName] = {
                registered: false,
                windowEventName,
                pluginEventName,
                handler: event => {
                    this.notifyListeners(pluginEventName, event);
                },
            };
        }
        unimplemented(msg = 'not implemented') {
            return new Capacitor$1.Exception(msg, ExceptionCode.Unimplemented);
        }
        unavailable(msg = 'not available') {
            return new Capacitor$1.Exception(msg, ExceptionCode.Unavailable);
        }
        async removeListener(eventName, listenerFunc) {
            const listeners = this.listeners[eventName];
            if (!listeners) {
                return;
            }
            const index = listeners.indexOf(listenerFunc);
            this.listeners[eventName].splice(index, 1);
            // If there are no more listeners for this type of event,
            // remove the window listener
            if (!this.listeners[eventName].length) {
                this.removeWindowListener(this.windowListeners[eventName]);
            }
        }
        addWindowListener(handle) {
            window.addEventListener(handle.windowEventName, handle.handler);
            handle.registered = true;
        }
        removeWindowListener(handle) {
            if (!handle) {
                return;
            }
            window.removeEventListener(handle.windowEventName, handle.handler);
            handle.registered = false;
        }
    }

    const Http = registerPlugin('Http', {
        web: () => Promise.resolve().then(function () { return web$1; }).then(m => new m.HttpWeb()),
        electron: () => Promise.resolve().then(function () { return web$1; }).then(m => new m.HttpWeb()),
    });

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    /**
     * lodash (Custom Build) <https://lodash.com/>
     * Build: `lodash modularize exports="npm" -o ./`
     * Copyright jQuery Foundation and other contributors <https://jquery.org/>
     * Released under MIT license <https://lodash.com/license>
     * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
     * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
     */

    /** Used as the `TypeError` message for "Functions" methods. */
    var FUNC_ERROR_TEXT = 'Expected a function';

    /** Used as references for various `Number` constants. */
    var NAN = 0 / 0;

    /** `Object#toString` result references. */
    var symbolTag = '[object Symbol]';

    /** Used to match leading and trailing whitespace. */
    var reTrim = /^\s+|\s+$/g;

    /** Used to detect bad signed hexadecimal string values. */
    var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;

    /** Used to detect binary string values. */
    var reIsBinary = /^0b[01]+$/i;

    /** Used to detect octal string values. */
    var reIsOctal = /^0o[0-7]+$/i;

    /** Built-in method references without a dependency on `root`. */
    var freeParseInt = parseInt;

    /** Detect free variable `global` from Node.js. */
    var freeGlobal = typeof commonjsGlobal == 'object' && commonjsGlobal && commonjsGlobal.Object === Object && commonjsGlobal;

    /** Detect free variable `self`. */
    var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

    /** Used as a reference to the global object. */
    var root = freeGlobal || freeSelf || Function('return this')();

    /** Used for built-in method references. */
    var objectProto = Object.prototype;

    /**
     * Used to resolve the
     * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
     * of values.
     */
    var objectToString = objectProto.toString;

    /* Built-in method references for those with the same name as other `lodash` methods. */
    var nativeMax = Math.max,
        nativeMin = Math.min;

    /**
     * Gets the timestamp of the number of milliseconds that have elapsed since
     * the Unix epoch (1 January 1970 00:00:00 UTC).
     *
     * @static
     * @memberOf _
     * @since 2.4.0
     * @category Date
     * @returns {number} Returns the timestamp.
     * @example
     *
     * _.defer(function(stamp) {
     *   console.log(_.now() - stamp);
     * }, _.now());
     * // => Logs the number of milliseconds it took for the deferred invocation.
     */
    var now = function() {
      return root.Date.now();
    };

    /**
     * Creates a debounced function that delays invoking `func` until after `wait`
     * milliseconds have elapsed since the last time the debounced function was
     * invoked. The debounced function comes with a `cancel` method to cancel
     * delayed `func` invocations and a `flush` method to immediately invoke them.
     * Provide `options` to indicate whether `func` should be invoked on the
     * leading and/or trailing edge of the `wait` timeout. The `func` is invoked
     * with the last arguments provided to the debounced function. Subsequent
     * calls to the debounced function return the result of the last `func`
     * invocation.
     *
     * **Note:** If `leading` and `trailing` options are `true`, `func` is
     * invoked on the trailing edge of the timeout only if the debounced function
     * is invoked more than once during the `wait` timeout.
     *
     * If `wait` is `0` and `leading` is `false`, `func` invocation is deferred
     * until to the next tick, similar to `setTimeout` with a timeout of `0`.
     *
     * See [David Corbacho's article](https://css-tricks.com/debouncing-throttling-explained-examples/)
     * for details over the differences between `_.debounce` and `_.throttle`.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Function
     * @param {Function} func The function to debounce.
     * @param {number} [wait=0] The number of milliseconds to delay.
     * @param {Object} [options={}] The options object.
     * @param {boolean} [options.leading=false]
     *  Specify invoking on the leading edge of the timeout.
     * @param {number} [options.maxWait]
     *  The maximum time `func` is allowed to be delayed before it's invoked.
     * @param {boolean} [options.trailing=true]
     *  Specify invoking on the trailing edge of the timeout.
     * @returns {Function} Returns the new debounced function.
     * @example
     *
     * // Avoid costly calculations while the window size is in flux.
     * jQuery(window).on('resize', _.debounce(calculateLayout, 150));
     *
     * // Invoke `sendMail` when clicked, debouncing subsequent calls.
     * jQuery(element).on('click', _.debounce(sendMail, 300, {
     *   'leading': true,
     *   'trailing': false
     * }));
     *
     * // Ensure `batchLog` is invoked once after 1 second of debounced calls.
     * var debounced = _.debounce(batchLog, 250, { 'maxWait': 1000 });
     * var source = new EventSource('/stream');
     * jQuery(source).on('message', debounced);
     *
     * // Cancel the trailing debounced invocation.
     * jQuery(window).on('popstate', debounced.cancel);
     */
    function debounce(func, wait, options) {
      var lastArgs,
          lastThis,
          maxWait,
          result,
          timerId,
          lastCallTime,
          lastInvokeTime = 0,
          leading = false,
          maxing = false,
          trailing = true;

      if (typeof func != 'function') {
        throw new TypeError(FUNC_ERROR_TEXT);
      }
      wait = toNumber(wait) || 0;
      if (isObject(options)) {
        leading = !!options.leading;
        maxing = 'maxWait' in options;
        maxWait = maxing ? nativeMax(toNumber(options.maxWait) || 0, wait) : maxWait;
        trailing = 'trailing' in options ? !!options.trailing : trailing;
      }

      function invokeFunc(time) {
        var args = lastArgs,
            thisArg = lastThis;

        lastArgs = lastThis = undefined;
        lastInvokeTime = time;
        result = func.apply(thisArg, args);
        return result;
      }

      function leadingEdge(time) {
        // Reset any `maxWait` timer.
        lastInvokeTime = time;
        // Start the timer for the trailing edge.
        timerId = setTimeout(timerExpired, wait);
        // Invoke the leading edge.
        return leading ? invokeFunc(time) : result;
      }

      function remainingWait(time) {
        var timeSinceLastCall = time - lastCallTime,
            timeSinceLastInvoke = time - lastInvokeTime,
            result = wait - timeSinceLastCall;

        return maxing ? nativeMin(result, maxWait - timeSinceLastInvoke) : result;
      }

      function shouldInvoke(time) {
        var timeSinceLastCall = time - lastCallTime,
            timeSinceLastInvoke = time - lastInvokeTime;

        // Either this is the first call, activity has stopped and we're at the
        // trailing edge, the system time has gone backwards and we're treating
        // it as the trailing edge, or we've hit the `maxWait` limit.
        return (lastCallTime === undefined || (timeSinceLastCall >= wait) ||
          (timeSinceLastCall < 0) || (maxing && timeSinceLastInvoke >= maxWait));
      }

      function timerExpired() {
        var time = now();
        if (shouldInvoke(time)) {
          return trailingEdge(time);
        }
        // Restart the timer.
        timerId = setTimeout(timerExpired, remainingWait(time));
      }

      function trailingEdge(time) {
        timerId = undefined;

        // Only invoke if we have `lastArgs` which means `func` has been
        // debounced at least once.
        if (trailing && lastArgs) {
          return invokeFunc(time);
        }
        lastArgs = lastThis = undefined;
        return result;
      }

      function cancel() {
        if (timerId !== undefined) {
          clearTimeout(timerId);
        }
        lastInvokeTime = 0;
        lastArgs = lastCallTime = lastThis = timerId = undefined;
      }

      function flush() {
        return timerId === undefined ? result : trailingEdge(now());
      }

      function debounced() {
        var time = now(),
            isInvoking = shouldInvoke(time);

        lastArgs = arguments;
        lastThis = this;
        lastCallTime = time;

        if (isInvoking) {
          if (timerId === undefined) {
            return leadingEdge(lastCallTime);
          }
          if (maxing) {
            // Handle invocations in a tight loop.
            timerId = setTimeout(timerExpired, wait);
            return invokeFunc(lastCallTime);
          }
        }
        if (timerId === undefined) {
          timerId = setTimeout(timerExpired, wait);
        }
        return result;
      }
      debounced.cancel = cancel;
      debounced.flush = flush;
      return debounced;
    }

    /**
     * Checks if `value` is the
     * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
     * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is an object, else `false`.
     * @example
     *
     * _.isObject({});
     * // => true
     *
     * _.isObject([1, 2, 3]);
     * // => true
     *
     * _.isObject(_.noop);
     * // => true
     *
     * _.isObject(null);
     * // => false
     */
    function isObject(value) {
      var type = typeof value;
      return !!value && (type == 'object' || type == 'function');
    }

    /**
     * Checks if `value` is object-like. A value is object-like if it's not `null`
     * and has a `typeof` result of "object".
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
     * @example
     *
     * _.isObjectLike({});
     * // => true
     *
     * _.isObjectLike([1, 2, 3]);
     * // => true
     *
     * _.isObjectLike(_.noop);
     * // => false
     *
     * _.isObjectLike(null);
     * // => false
     */
    function isObjectLike(value) {
      return !!value && typeof value == 'object';
    }

    /**
     * Checks if `value` is classified as a `Symbol` primitive or object.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
     * @example
     *
     * _.isSymbol(Symbol.iterator);
     * // => true
     *
     * _.isSymbol('abc');
     * // => false
     */
    function isSymbol(value) {
      return typeof value == 'symbol' ||
        (isObjectLike(value) && objectToString.call(value) == symbolTag);
    }

    /**
     * Converts `value` to a number.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to process.
     * @returns {number} Returns the number.
     * @example
     *
     * _.toNumber(3.2);
     * // => 3.2
     *
     * _.toNumber(Number.MIN_VALUE);
     * // => 5e-324
     *
     * _.toNumber(Infinity);
     * // => Infinity
     *
     * _.toNumber('3.2');
     * // => 3.2
     */
    function toNumber(value) {
      if (typeof value == 'number') {
        return value;
      }
      if (isSymbol(value)) {
        return NAN;
      }
      if (isObject(value)) {
        var other = typeof value.valueOf == 'function' ? value.valueOf() : value;
        value = isObject(other) ? (other + '') : other;
      }
      if (typeof value != 'string') {
        return value === 0 ? value : +value;
      }
      value = value.replace(reTrim, '');
      var isBinary = reIsBinary.test(value);
      return (isBinary || reIsOctal.test(value))
        ? freeParseInt(value.slice(2), isBinary ? 2 : 8)
        : (reIsBadHex.test(value) ? NAN : +value);
    }

    var lodash_debounce = debounce;

    // Unique ID creation requires a high quality random # generator. In the browser we therefore
    // require the crypto API and do not support built-in fallback to lower quality random number
    // generators (like Math.random()).
    var getRandomValues;
    var rnds8 = new Uint8Array(16);
    function rng() {
      // lazy load so that environments that need to polyfill have a chance to do so
      if (!getRandomValues) {
        // getRandomValues needs to be invoked in a context where "this" is a Crypto implementation. Also,
        // find the complete implementation of crypto (msCrypto) on IE11.
        getRandomValues = typeof crypto !== 'undefined' && crypto.getRandomValues && crypto.getRandomValues.bind(crypto) || typeof msCrypto !== 'undefined' && typeof msCrypto.getRandomValues === 'function' && msCrypto.getRandomValues.bind(msCrypto);

        if (!getRandomValues) {
          throw new Error('crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported');
        }
      }

      return getRandomValues(rnds8);
    }

    var REGEX = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$/i;

    function validate(uuid) {
      return typeof uuid === 'string' && REGEX.test(uuid);
    }

    /**
     * Convert array of 16 byte values to UUID string format of the form:
     * XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
     */

    var byteToHex = [];

    for (var i = 0; i < 256; ++i) {
      byteToHex.push((i + 0x100).toString(16).substr(1));
    }

    function stringify(arr) {
      var offset = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
      // Note: Be careful editing this code!  It's been tuned for performance
      // and works in ways you may not expect. See https://github.com/uuidjs/uuid/pull/434
      var uuid = (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + '-' + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + '-' + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + '-' + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + '-' + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase(); // Consistency check for valid UUID.  If this throws, it's likely due to one
      // of the following:
      // - One or more input array values don't map to a hex octet (leading to
      // "undefined" in the uuid)
      // - Invalid input values for the RFC `version` or `variant` fields

      if (!validate(uuid)) {
        throw TypeError('Stringified UUID is invalid');
      }

      return uuid;
    }

    function v4(options, buf, offset) {
      options = options || {};
      var rnds = options.random || (options.rng || rng)(); // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`

      rnds[6] = rnds[6] & 0x0f | 0x40;
      rnds[8] = rnds[8] & 0x3f | 0x80; // Copy bytes to buffer, if provided

      if (buf) {
        offset = offset || 0;

        for (var i = 0; i < 16; ++i) {
          buf[offset + i] = rnds[i];
        }

        return buf;
      }

      return stringify(rnds);
    }

    // Check if runs on browser
    const isBrowser = typeof Capacitor === 'undefined';
    let token = null;

    // get server_api from .env
    const server_api = "https://callizaya.com/enfocate/api.php";

    // CONSTANTS //
    const INACTIVE_STATUS = "inactive";
    const ACTIVE_STATUS = "active";
    const COMPLETED_STATUS = "completed";
    const CANCELED_STATUS = "canceled";

    // STORE //
    const storedTasks = JSON.parse(localStorage.getItem('tasks')) || [];
    const tasksStore = writable(storedTasks);
    const storedUser = JSON.parse(localStorage.getItem('user')) || { id: "", email: "" };
    const userStore = writable(storedUser);

    // ACTIONS //
    // Add new task
    function addNewTask(task) {
    	task = Object.assign({
    		id: v4(),
    		title: translation("New task"),
    		status: INACTIVE_STATUS,
    		time: 0,
    		aspects: [],
    	}, task);
    	tasksStore.update(value => {
    		value.push(task);
    		return value;
    	});
    	return task;
    }
    // Complete a task
    function completeTask(task) {
    	let currentTask;
    	tasksStore.update(value => {
    		currentTask = value.find(t => t.id === task.id);
    		currentTask.status = "completed";
    		currentTask.completed_at = new Date().getTime();
    		return value;
    	});
    	return currentTask;
    }
    // Start a task
    function startTask(task) {
    	let currentTask;
    	tasksStore.update(value => {
    		// Stop all the active tasks
    		value.forEach(t => {
    			if (t.status === ACTIVE_STATUS) {
    				t.status = INACTIVE_STATUS;
    			}
    		});
    		// Start task
    		currentTask = value.find(t => t.id === task.id);
    		currentTask.status = "active";
    		currentTask.completed_at = null;
    		// set timestamp
    		if (!currentTask.started_at) {
    			currentTask.started_at = new Date().getTime();
    		}
    		currentTask.continue_at = new Date().getTime();
    		currentTask.continue_time = currentTask.time;
    		return value;
    	});
    	return currentTask;
    }
    // Update time
    function updateTime(task, time = new Date().getTime()) {
    	let currentTask;
    	tasksStore.update(value => {
    		currentTask = value.find(t => t.id === task.id);
    		currentTask.time = currentTask.continue_time + (time - currentTask.continue_at);
    		return value;
    	});
    	return currentTask;
    }
    // Pause task
    function pauseTask(task) {
    	let currentTask;
    	tasksStore.update(value => {
    		currentTask = value.find(t => t.id === task.id);
    		currentTask.status = "paused";
    		return value;
    	});
    	return currentTask;
    }
    // Stop task
    function stopTask(task) {
    	let currentTask;
    	tasksStore.update(value => {
    		currentTask = value.find(t => t.id === task.id);
    		currentTask.status = "inactive";
    		return value;
    	});
    	return currentTask;
    }
    // Cancel task
    function cancelTask(task) {
    	let currentTask;
    	tasksStore.update(value => {
    		currentTask = value.find(t => t.id === task.id);
    		currentTask.status = "canceled";
    		currentTask.canceled_at = new Date().getTime();
    		return value;
    	});
    	return currentTask;
    }
    function removeTask(task) {
    	tasksStore.update(value => {
    		value.splice(value.indexOf(task), 1);
    		return value;
    	});
    }
    function reopenTask(task) {
    	let currentTask;
    	tasksStore.update(value => {
    		currentTask = value.find(t => t.id === task.id);
    		currentTask.status = "inactive";
    		return value;
    	});
    	return currentTask;
    }
    // Set aspects
    function setAspects(task, aspects) {
    	let currentTask;
    	tasksStore.update(value => {
    		currentTask = value.find(t => t.id === task.id);
    		currentTask.aspects = aspects;
    		return value;
    	});
    	return currentTask;
    }
    // Simple api function
    function api(url, options) {
    	if (isBrowser) {
    		return fetch(url, {
    			method: options.method,
    			headers: options.headers,
    			body: JSON.stringify(options.data)
    		}).then((res) => res.json());
    	} else {
    		return Http.request({
    			url,
    			method: options.method,
    			headers: options.headers,
    			data: options.data,
    		}).then(res => res.data);
    	}
    }
    // Login user
    async function login(email, password) {
    	const login_endpoint = `${server_api}/login`;
    	const res = await api(login_endpoint, {
    		method: "POST",
    		headers: {
    			"Content-Type": "application/json",
    		},
    		data: { email, password },
    	});
    	if (res.status !== "success") {
    		throw res.message;
    	}
    	let user = res.user;
    	userStore.update(value => {
    		value.id = user.id;
    		value.email = user.email;
    		token = user.token;
    		user = value;
    		if (user.tasks) {
    			localStorage.setItem('lastSyncTasks', JSON.stringify(user.tasks));
    			mergeTasks(user.tasks);
    		}
    		return value;
    	});
    	return user;
    }
    function logout() {
    	userStore.update(value => {
    		value.id = "";
    		value.email = "";
    		return value;
    	});
    }
    function mergeTasks(newTasks) {
    	tasksStore.update(value => {
    		newTasks.forEach(newTask => {
    			let currentTask = value.find(t => t.id === newTask.id);
    			if (currentTask) ; else {
    				value.push(newTask);
    			}
    		});
    		return value;
    	});
    }
    // sync function
    function syncTasks(currentTasks) {
    	userStore.update(currentUser => {
    		if (!currentUser.id) {
    			return currentUser;
    		}
    		const sync_endpoint = `${server_api}/sync/${currentUser.id}`;
    		const lastSyncTasks = JSON.parse(localStorage.getItem('lastSyncTasks')) || [];
    		// filter tasks to sync, only tasks that changed
    		const syncTasks = currentTasks.filter(task => {
    			const last = lastSyncTasks.find(t => t.id === task.id);
    			if (JSON.stringify(task) !== JSON.stringify(last)) {
    				return true;
    			}
    		});
    		// send to api
    		api(sync_endpoint, {
    			method: 'POST',
    			headers: {
    				'Content-Type': 'application/json',
    				'Authorization': `Bearer ${token}`,
    			},
    			data: {
    				tasks: syncTasks
    			}
    		}).then(() => {
    			localStorage.setItem('lastSyncTasks', JSON.stringify(currentTasks));
    		});
    		return currentUser;
    	});
    }
    // debounce sync function 30 seconds
    const debounceSyncTasks = lodash_debounce(syncTasks, 30000, {
    	maxWait: 30000
    });
    tasksStore.subscribe(value => {
    	localStorage.setItem('tasks', JSON.stringify(value));
    	debounceSyncTasks(value);
    });
    userStore.subscribe(value => {
    	localStorage.setItem('user', JSON.stringify(value));
    });

    /* src/components/Login.svelte generated by Svelte v3.46.6 */

    const { console: console_1$1 } = globals;
    const file$4 = "src/components/Login.svelte";

    // (47:3) {#if user.email}
    function create_if_block$2(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = `${translation("Salir")}`;
    			attr_dev(button, "type", "reset");
    			add_location(button, file$4, 47, 4, 906);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*onlogout*/ ctx[4], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(47:3) {#if user.email}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let g2;
    	let foreignObject;
    	let form;
    	let input0;
    	let t0;
    	let input1;
    	let t1;
    	let button;
    	let t3;
    	let t4;
    	let g0;
    	let circle0;
    	let path0;
    	let g1;
    	let circle1;
    	let path1;
    	let mounted;
    	let dispose;
    	let if_block = /*user*/ ctx[2].email && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			g2 = svg_element("g");
    			foreignObject = svg_element("foreignObject");
    			form = element("form");
    			input0 = element("input");
    			t0 = space();
    			input1 = element("input");
    			t1 = space();
    			button = element("button");
    			button.textContent = `${translation("Ingresar")}`;
    			t3 = space();
    			if (if_block) if_block.c();
    			t4 = space();
    			g0 = svg_element("g");
    			circle0 = svg_element("circle");
    			path0 = svg_element("path");
    			g1 = svg_element("g");
    			circle1 = svg_element("circle");
    			path1 = svg_element("path");
    			attr_dev(input0, "placeholder", translation("email"));
    			attr_dev(input0, "autocorrect", "off");
    			attr_dev(input0, "autocapitalize", "none");
    			add_location(input0, file$4, 34, 3, 625);
    			attr_dev(input1, "placeholder", translation("password"));
    			attr_dev(input1, "type", "password");
    			add_location(input1, file$4, 40, 3, 741);
    			attr_dev(button, "type", "submit");
    			add_location(button, file$4, 45, 3, 835);
    			add_location(form, file$4, 33, 2, 579);
    			attr_dev(foreignObject, "x", "41");
    			attr_dev(foreignObject, "y", "200");
    			attr_dev(foreignObject, "width", "350");
    			attr_dev(foreignObject, "height", "400");
    			add_location(foreignObject, file$4, 32, 1, 521);
    			attr_dev(circle0, "id", "Ellipse 2");
    			attr_dev(circle0, "cx", "346");
    			attr_dev(circle0, "cy", "596");
    			attr_dev(circle0, "r", "49.5");
    			attr_dev(circle0, "fill", "#2CC990");
    			attr_dev(circle0, "stroke", "black");
    			add_location(circle0, file$4, 52, 2, 1039);
    			attr_dev(path0, "id", "Vector 1");
    			attr_dev(path0, "d", "M364.736 572.467L337.325 600.189L326.697 589.157C326.697 589.157 321.103 584.348 315.788 589.157C310.474 593.966 314.39 600.189 314.39 600.189L331.731 617.728C331.731 617.728 335.334 620.17 337.885 619.991C340.031 619.84 342.92 617.728 342.92 617.728L376.484 583.782C376.484 583.782 380.4 578.691 375.645 573.599C370.89 568.507 364.736 572.467 364.736 572.467Z");
    			attr_dev(path0, "fill", "white");
    			attr_dev(path0, "stroke", "black");
    			add_location(path0, file$4, 60, 2, 1144);
    			attr_dev(g0, "id", "check");
    			attr_dev(g0, "opacity", "0.75");
    			add_location(g0, file$4, 51, 1, 1007);
    			attr_dev(circle1, "id", "Ellipse 3");
    			attr_dev(circle1, "cx", "80");
    			attr_dev(circle1, "cy", "596");
    			attr_dev(circle1, "r", "49.5");
    			attr_dev(circle1, "fill", "#FCB941");
    			attr_dev(circle1, "stroke", "black");
    			add_location(circle1, file$4, 68, 2, 1612);
    			attr_dev(path1, "id", "Vector 21");
    			attr_dev(path1, "d", "M116.473 596.106C116.473 587.41 108.876 588.142 108.876 588.142H81.5053V573.129L41.6855 596.106L81.5053 619.357V604.802H108.876C108.876 604.802 116.473 604.802 116.473 596.106Z");
    			attr_dev(path1, "fill", "white");
    			attr_dev(path1, "stroke", "black");
    			add_location(path1, file$4, 76, 2, 1716);
    			attr_dev(g1, "id", "back");
    			attr_dev(g1, "opacity", "0.75");
    			add_location(g1, file$4, 67, 1, 1581);
    			attr_dev(g2, "id", "Login");
    			add_location(g2, file$4, 31, 0, 505);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, g2, anchor);
    			append_dev(g2, foreignObject);
    			append_dev(foreignObject, form);
    			append_dev(form, input0);
    			set_input_value(input0, /*email*/ ctx[0]);
    			append_dev(form, t0);
    			append_dev(form, input1);
    			set_input_value(input1, /*password*/ ctx[1]);
    			append_dev(form, t1);
    			append_dev(form, button);
    			append_dev(form, t3);
    			if (if_block) if_block.m(form, null);
    			append_dev(form, t4);
    			append_dev(g2, g0);
    			append_dev(g0, circle0);
    			append_dev(g0, path0);
    			append_dev(g2, g1);
    			append_dev(g1, circle1);
    			append_dev(g1, path1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[5]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[6]),
    					listen_dev(form, "submit", prevent_default(/*onsubmit*/ ctx[3]), false, true, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*email*/ 1 && input0.value !== /*email*/ ctx[0]) {
    				set_input_value(input0, /*email*/ ctx[0]);
    			}

    			if (dirty & /*password*/ 2 && input1.value !== /*password*/ ctx[1]) {
    				set_input_value(input1, /*password*/ ctx[1]);
    			}

    			if (/*user*/ ctx[2].email) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$2(ctx);
    					if_block.c();
    					if_block.m(form, t4);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(g2);
    			if (if_block) if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Login', slots, []);
    	let email;
    	let password;
    	let user = {};

    	userStore.subscribe(value => {
    		$$invalidate(2, user = value);

    		if (user.email) {
    			$$invalidate(0, email = user.email);
    		}
    	});

    	async function onsubmit() {
    		try {
    			await login(email, password);
    			push("/");
    		} catch(err) {
    			console.log(err);
    		}
    	}

    	function onlogout() {
    		logout();
    		push("/");
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$1.warn(`<Login> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		email = this.value;
    		$$invalidate(0, email);
    	}

    	function input1_input_handler() {
    		password = this.value;
    		$$invalidate(1, password);
    	}

    	$$self.$capture_state = () => ({
    		push,
    		userStore,
    		login,
    		logout,
    		_: translation,
    		email,
    		password,
    		user,
    		onsubmit,
    		onlogout
    	});

    	$$self.$inject_state = $$props => {
    		if ('email' in $$props) $$invalidate(0, email = $$props.email);
    		if ('password' in $$props) $$invalidate(1, password = $$props.password);
    		if ('user' in $$props) $$invalidate(2, user = $$props.user);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		email,
    		password,
    		user,
    		onsubmit,
    		onlogout,
    		input0_input_handler,
    		input1_input_handler
    	];
    }

    class Login extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Login",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src/components/Aspectos.svelte generated by Svelte v3.46.6 */
    const file$3 = "src/components/Aspectos.svelte";

    function create_fragment$3(ctx) {
    	let text0;
    	let t0_value = translation("Escoge la(s) categoria(s)") + "";
    	let t0;
    	let t1;
    	let text1;
    	let t2_value = translation("de la actividad") + "";
    	let t2;
    	let t3;
    	let g4;
    	let circle0;
    	let g0;
    	let circle1;
    	let path0;
    	let g1;
    	let circle2;
    	let path1;
    	let g2;
    	let circle3;
    	let path2;
    	let g3;
    	let circle4;
    	let path3;
    	let circle5;
    	let g4_class_value;
    	let t4;
    	let g9;
    	let circle6;
    	let g5;
    	let circle7;
    	let path4;
    	let g6;
    	let circle8;
    	let path5;
    	let g7;
    	let circle9;
    	let path6;
    	let rect0;
    	let path7;
    	let path8;
    	let g8;
    	let path9;
    	let path10;
    	let path11;
    	let path12;
    	let rect1;
    	let rect2;
    	let rect3;
    	let path13;
    	let path14;
    	let g9_class_value;
    	let t5;
    	let g10;
    	let circle10;
    	let path15;
    	let path16;
    	let rect4;
    	let g10_class_value;
    	let t6;
    	let g13;
    	let circle11;
    	let rect5;
    	let rect6;
    	let g11;
    	let path17;
    	let path18;
    	let path19;
    	let path20;
    	let path21;
    	let path22;
    	let g12;
    	let path23;
    	let path24;
    	let path25;
    	let path26;
    	let path27;
    	let path28;
    	let g13_class_value;
    	let t7;
    	let g17;
    	let circle12;
    	let g14;
    	let circle13;
    	let path29;
    	let g15;
    	let circle14;
    	let path30;
    	let g16;
    	let circle15;
    	let path31;
    	let rect7;
    	let path32;
    	let path33;
    	let line0;
    	let line1;
    	let line2;
    	let line3;
    	let line4;
    	let path34;
    	let g17_class_value;
    	let t8;
    	let g18;
    	let circle16;
    	let circle17;
    	let path35;
    	let path36;
    	let path37;
    	let g18_class_value;
    	let t9;
    	let g19;
    	let circle18;
    	let path38;
    	let path39;
    	let g19_class_value;
    	let t10;
    	let g21;
    	let circle19;
    	let g20;
    	let path40;
    	let path41;
    	let circle20;
    	let g21_class_value;
    	let t11;
    	let g22;
    	let circle21;
    	let rect8;
    	let rect9;
    	let rect10;
    	let rect11;
    	let rect12;
    	let rect13;
    	let rect14;
    	let rect15;
    	let rect16;
    	let rect17;
    	let rect18;
    	let g22_class_value;
    	let t12;
    	let g23;
    	let circle22;
    	let path42;
    	let path43;
    	let path44;
    	let path45;
    	let circle23;
    	let path46;
    	let rect19;
    	let rect20;
    	let g23_class_value;
    	let t13;
    	let g24;
    	let circle24;
    	let path47;
    	let path48;
    	let path49;
    	let path50;
    	let g24_class_value;
    	let t14;
    	let g25;
    	let circle25;
    	let rect21;
    	let line5;
    	let line6;
    	let rect22;
    	let rect23;
    	let rect24;
    	let rect25;
    	let rect26;
    	let rect27;
    	let path51;
    	let g25_class_value;
    	let t15;
    	let g26;
    	let circle26;
    	let circle27;
    	let circle28;
    	let circle29;
    	let path52;
    	let circle30;
    	let path53;
    	let g26_class_value;
    	let t16;
    	let g29;
    	let circle31;
    	let path54;
    	let path55;
    	let g27;
    	let path56;
    	let path57;
    	let path58;
    	let path59;
    	let g28;
    	let ellipse0;
    	let ellipse1;
    	let circle32;
    	let circle33;
    	let line7;
    	let line8;
    	let g29_class_value;
    	let t17;
    	let g31;
    	let circle34;
    	let circle35;
    	let g30;
    	let path60;
    	let path61;
    	let g31_class_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			text0 = svg_element("text");
    			t0 = text(t0_value);
    			t1 = space();
    			text1 = svg_element("text");
    			t2 = text(t2_value);
    			t3 = space();
    			g4 = svg_element("g");
    			circle0 = svg_element("circle");
    			g0 = svg_element("g");
    			circle1 = svg_element("circle");
    			path0 = svg_element("path");
    			g1 = svg_element("g");
    			circle2 = svg_element("circle");
    			path1 = svg_element("path");
    			g2 = svg_element("g");
    			circle3 = svg_element("circle");
    			path2 = svg_element("path");
    			g3 = svg_element("g");
    			circle4 = svg_element("circle");
    			path3 = svg_element("path");
    			circle5 = svg_element("circle");
    			t4 = space();
    			g9 = svg_element("g");
    			circle6 = svg_element("circle");
    			g5 = svg_element("g");
    			circle7 = svg_element("circle");
    			path4 = svg_element("path");
    			g6 = svg_element("g");
    			circle8 = svg_element("circle");
    			path5 = svg_element("path");
    			g7 = svg_element("g");
    			circle9 = svg_element("circle");
    			path6 = svg_element("path");
    			rect0 = svg_element("rect");
    			path7 = svg_element("path");
    			path8 = svg_element("path");
    			g8 = svg_element("g");
    			path9 = svg_element("path");
    			path10 = svg_element("path");
    			path11 = svg_element("path");
    			path12 = svg_element("path");
    			rect1 = svg_element("rect");
    			rect2 = svg_element("rect");
    			rect3 = svg_element("rect");
    			path13 = svg_element("path");
    			path14 = svg_element("path");
    			t5 = space();
    			g10 = svg_element("g");
    			circle10 = svg_element("circle");
    			path15 = svg_element("path");
    			path16 = svg_element("path");
    			rect4 = svg_element("rect");
    			t6 = space();
    			g13 = svg_element("g");
    			circle11 = svg_element("circle");
    			rect5 = svg_element("rect");
    			rect6 = svg_element("rect");
    			g11 = svg_element("g");
    			path17 = svg_element("path");
    			path18 = svg_element("path");
    			path19 = svg_element("path");
    			path20 = svg_element("path");
    			path21 = svg_element("path");
    			path22 = svg_element("path");
    			g12 = svg_element("g");
    			path23 = svg_element("path");
    			path24 = svg_element("path");
    			path25 = svg_element("path");
    			path26 = svg_element("path");
    			path27 = svg_element("path");
    			path28 = svg_element("path");
    			t7 = space();
    			g17 = svg_element("g");
    			circle12 = svg_element("circle");
    			g14 = svg_element("g");
    			circle13 = svg_element("circle");
    			path29 = svg_element("path");
    			g15 = svg_element("g");
    			circle14 = svg_element("circle");
    			path30 = svg_element("path");
    			g16 = svg_element("g");
    			circle15 = svg_element("circle");
    			path31 = svg_element("path");
    			rect7 = svg_element("rect");
    			path32 = svg_element("path");
    			path33 = svg_element("path");
    			line0 = svg_element("line");
    			line1 = svg_element("line");
    			line2 = svg_element("line");
    			line3 = svg_element("line");
    			line4 = svg_element("line");
    			path34 = svg_element("path");
    			t8 = space();
    			g18 = svg_element("g");
    			circle16 = svg_element("circle");
    			circle17 = svg_element("circle");
    			path35 = svg_element("path");
    			path36 = svg_element("path");
    			path37 = svg_element("path");
    			t9 = space();
    			g19 = svg_element("g");
    			circle18 = svg_element("circle");
    			path38 = svg_element("path");
    			path39 = svg_element("path");
    			t10 = space();
    			g21 = svg_element("g");
    			circle19 = svg_element("circle");
    			g20 = svg_element("g");
    			path40 = svg_element("path");
    			path41 = svg_element("path");
    			circle20 = svg_element("circle");
    			t11 = space();
    			g22 = svg_element("g");
    			circle21 = svg_element("circle");
    			rect8 = svg_element("rect");
    			rect9 = svg_element("rect");
    			rect10 = svg_element("rect");
    			rect11 = svg_element("rect");
    			rect12 = svg_element("rect");
    			rect13 = svg_element("rect");
    			rect14 = svg_element("rect");
    			rect15 = svg_element("rect");
    			rect16 = svg_element("rect");
    			rect17 = svg_element("rect");
    			rect18 = svg_element("rect");
    			t12 = space();
    			g23 = svg_element("g");
    			circle22 = svg_element("circle");
    			path42 = svg_element("path");
    			path43 = svg_element("path");
    			path44 = svg_element("path");
    			path45 = svg_element("path");
    			circle23 = svg_element("circle");
    			path46 = svg_element("path");
    			rect19 = svg_element("rect");
    			rect20 = svg_element("rect");
    			t13 = space();
    			g24 = svg_element("g");
    			circle24 = svg_element("circle");
    			path47 = svg_element("path");
    			path48 = svg_element("path");
    			path49 = svg_element("path");
    			path50 = svg_element("path");
    			t14 = space();
    			g25 = svg_element("g");
    			circle25 = svg_element("circle");
    			rect21 = svg_element("rect");
    			line5 = svg_element("line");
    			line6 = svg_element("line");
    			rect22 = svg_element("rect");
    			rect23 = svg_element("rect");
    			rect24 = svg_element("rect");
    			rect25 = svg_element("rect");
    			rect26 = svg_element("rect");
    			rect27 = svg_element("rect");
    			path51 = svg_element("path");
    			t15 = space();
    			g26 = svg_element("g");
    			circle26 = svg_element("circle");
    			circle27 = svg_element("circle");
    			circle28 = svg_element("circle");
    			circle29 = svg_element("circle");
    			path52 = svg_element("path");
    			circle30 = svg_element("circle");
    			path53 = svg_element("path");
    			t16 = space();
    			g29 = svg_element("g");
    			circle31 = svg_element("circle");
    			path54 = svg_element("path");
    			path55 = svg_element("path");
    			g27 = svg_element("g");
    			path56 = svg_element("path");
    			path57 = svg_element("path");
    			path58 = svg_element("path");
    			path59 = svg_element("path");
    			g28 = svg_element("g");
    			ellipse0 = svg_element("ellipse");
    			ellipse1 = svg_element("ellipse");
    			circle32 = svg_element("circle");
    			circle33 = svg_element("circle");
    			line7 = svg_element("line");
    			line8 = svg_element("line");
    			t17 = space();
    			g31 = svg_element("g");
    			circle34 = svg_element("circle");
    			circle35 = svg_element("circle");
    			g30 = svg_element("g");
    			path60 = svg_element("path");
    			path61 = svg_element("path");
    			attr_dev(text0, "id", "title");
    			attr_dev(text0, "x", "32");
    			attr_dev(text0, "y", "64");
    			attr_dev(text0, "font-size", "35");
    			attr_dev(text0, "font-weight", "800");
    			attr_dev(text0, "stroke", "black");
    			attr_dev(text0, "fill", "white");
    			add_location(text0, file$3, 16, 0, 381);
    			attr_dev(text1, "id", "title");
    			attr_dev(text1, "x", "112");
    			attr_dev(text1, "y", "102");
    			attr_dev(text1, "font-size", "35");
    			attr_dev(text1, "font-weight", "800");
    			attr_dev(text1, "stroke", "black");
    			attr_dev(text1, "fill", "white");
    			add_location(text1, file$3, 27, 0, 524);
    			attr_dev(circle0, "id", "Ellipse 3");
    			attr_dev(circle0, "cx", "66");
    			attr_dev(circle0, "cy", "270");
    			attr_dev(circle0, "r", "49.5");
    			attr_dev(circle0, "fill", "#FCB941");
    			attr_dev(circle0, "stroke", "black");
    			add_location(circle0, file$3, 44, 1, 766);
    			attr_dev(circle1, "id", "Ellipse 8");
    			attr_dev(circle1, "cx", "66.1429");
    			attr_dev(circle1, "cy", "286.848");
    			attr_dev(circle1, "r", "6.72378");
    			attr_dev(circle1, "fill", "black");
    			add_location(circle1, file$3, 53, 2, 881);
    			attr_dev(path0, "id", "Ellipse 9");
    			attr_dev(path0, "d", "M75.7267 301.89C75.7267 299.364 74.7233 296.941 72.9371 295.155C71.1509 293.369 68.7283 292.365 66.2023 292.365C63.6763 292.365 61.2537 293.369 59.4675 295.155C57.6813 296.941 56.6779 299.364 56.6779 301.89L66.2023 301.89H75.7267Z");
    			attr_dev(path0, "fill", "black");
    			add_location(path0, file$3, 60, 2, 977);
    			attr_dev(g0, "id", "Group 3");
    			add_location(g0, file$3, 52, 1, 862);
    			attr_dev(circle2, "id", "Ellipse 8_2");
    			attr_dev(circle2, "cx", "66.1429");
    			attr_dev(circle2, "cy", "239.477");
    			attr_dev(circle2, "r", "6.72378");
    			attr_dev(circle2, "fill", "black");
    			add_location(circle2, file$3, 67, 2, 1286);
    			attr_dev(path1, "id", "Ellipse 9_2");
    			attr_dev(path1, "d", "M75.7267 254.519C75.7267 251.993 74.7233 249.57 72.9371 247.784C71.1509 245.998 68.7283 244.995 66.2023 244.995C63.6763 244.995 61.2537 245.998 59.4675 247.784C57.6813 249.57 56.6779 251.993 56.6779 254.519L66.2023 254.519H75.7267Z");
    			attr_dev(path1, "fill", "black");
    			add_location(path1, file$3, 74, 2, 1384);
    			attr_dev(g1, "id", "Group 1");
    			add_location(g1, file$3, 66, 1, 1267);
    			attr_dev(circle3, "id", "Ellipse 8_3");
    			attr_dev(circle3, "cx", "41.3686");
    			attr_dev(circle3, "cy", "267.587");
    			attr_dev(circle3, "r", "6.72378");
    			attr_dev(circle3, "fill", "black");
    			add_location(circle3, file$3, 81, 2, 1696);
    			attr_dev(path2, "id", "Ellipse 9_3");
    			attr_dev(path2, "d", "M50.9524 282.63C50.9524 280.103 49.949 277.681 48.1628 275.895C46.3766 274.109 43.954 273.105 41.428 273.105C38.902 273.105 36.4794 274.109 34.6932 275.895C32.907 277.681 31.9036 280.103 31.9036 282.63L41.428 282.63H50.9524Z");
    			attr_dev(path2, "fill", "black");
    			add_location(path2, file$3, 88, 2, 1794);
    			attr_dev(g2, "id", "Group 2");
    			add_location(g2, file$3, 80, 1, 1677);
    			attr_dev(circle4, "id", "Ellipse 8_4");
    			attr_dev(circle4, "cx", "90.9168");
    			attr_dev(circle4, "cy", "267.587");
    			attr_dev(circle4, "r", "6.72378");
    			attr_dev(circle4, "fill", "black");
    			add_location(circle4, file$3, 95, 2, 2099);
    			attr_dev(path3, "id", "Ellipse 9_4");
    			attr_dev(path3, "d", "M100.501 282.63C100.501 280.103 99.4971 277.681 97.711 275.895C95.9248 274.109 93.5022 273.105 90.9762 273.105C88.4501 273.105 86.0275 274.109 84.2414 275.895C82.4552 277.681 81.4517 280.103 81.4517 282.63L90.9762 282.63H100.501Z");
    			attr_dev(path3, "fill", "black");
    			add_location(path3, file$3, 102, 2, 2197);
    			attr_dev(g3, "id", "Group 4");
    			add_location(g3, file$3, 94, 1, 2080);
    			attr_dev(circle5, "id", "Ellipse 10");
    			attr_dev(circle5, "cx", "66.1429");
    			attr_dev(circle5, "cy", "271.455");
    			attr_dev(circle5, "r", "24.5");
    			attr_dev(circle5, "stroke", "black");
    			attr_dev(circle5, "stroke-dasharray", "2 2");
    			add_location(circle5, file$3, 108, 1, 2488);
    			attr_dev(g4, "id", "work_group");
    			attr_dev(g4, "class", g4_class_value = "" + (null_to_empty(checkedClass(/*checked*/ ctx[0], "work_group")) + " svelte-1iokz0g"));
    			add_location(g4, file$3, 39, 0, 660);
    			attr_dev(circle6, "id", "Ellipse 3_2");
    			attr_dev(circle6, "cx", "66");
    			attr_dev(circle6, "cy", "370");
    			attr_dev(circle6, "r", "49.5");
    			attr_dev(circle6, "fill", "#FCB941");
    			attr_dev(circle6, "stroke", "black");
    			add_location(circle6, file$3, 122, 1, 2733);
    			attr_dev(circle7, "id", "Ellipse 8_5");
    			attr_dev(circle7, "cx", "82.4501");
    			attr_dev(circle7, "cy", "386.356");
    			attr_dev(circle7, "r", "6.23163");
    			attr_dev(circle7, "fill", "black");
    			add_location(circle7, file$3, 131, 2, 2850);
    			attr_dev(path4, "id", "Ellipse 9_5");
    			attr_dev(path4, "d", "M91.3324 400.297C91.3324 397.955 90.4024 395.71 88.747 394.055C87.0915 392.399 84.8463 391.469 82.5051 391.469C80.164 391.469 77.9187 392.399 76.2633 394.055C74.6079 395.71 73.6779 397.955 73.6779 400.297L82.5051 400.297H91.3324Z");
    			attr_dev(path4, "fill", "black");
    			add_location(path4, file$3, 138, 2, 2948);
    			attr_dev(g5, "id", "Group 5");
    			add_location(g5, file$3, 130, 1, 2831);
    			attr_dev(circle8, "id", "Ellipse 8_6");
    			attr_dev(circle8, "cx", "66.4501");
    			attr_dev(circle8, "cy", "386.356");
    			attr_dev(circle8, "r", "6.23163");
    			attr_dev(circle8, "fill", "black");
    			add_location(circle8, file$3, 145, 2, 3260);
    			attr_dev(path5, "id", "Ellipse 9_6");
    			attr_dev(path5, "d", "M75.3324 400.297C75.3324 397.955 74.4024 395.71 72.747 394.055C71.0915 392.399 68.8463 391.469 66.5051 391.469C64.164 391.469 61.9187 392.399 60.2633 394.055C58.6079 395.71 57.6779 397.955 57.6779 400.297L66.5051 400.297H75.3324Z");
    			attr_dev(path5, "fill", "black");
    			add_location(path5, file$3, 152, 2, 3358);
    			attr_dev(g6, "id", "Group 3_2");
    			add_location(g6, file$3, 144, 1, 3239);
    			attr_dev(circle9, "id", "Ellipse 8_7");
    			attr_dev(circle9, "cx", "50.4501");
    			attr_dev(circle9, "cy", "386.356");
    			attr_dev(circle9, "r", "6.23163");
    			attr_dev(circle9, "fill", "black");
    			add_location(circle9, file$3, 159, 2, 3670);
    			attr_dev(path6, "id", "Ellipse 9_7");
    			attr_dev(path6, "d", "M59.3324 400.297C59.3324 397.955 58.4024 395.71 56.747 394.055C55.0915 392.399 52.8463 391.469 50.5051 391.469C48.164 391.469 45.9187 392.399 44.2633 394.055C42.6079 395.71 41.6779 397.955 41.6779 400.297L50.5051 400.297H59.3324Z");
    			attr_dev(path6, "fill", "black");
    			add_location(path6, file$3, 166, 2, 3768);
    			attr_dev(g7, "id", "Group 4_2");
    			add_location(g7, file$3, 158, 1, 3649);
    			attr_dev(rect0, "id", "Rectangle 5");
    			attr_dev(rect0, "x", "41.4868");
    			attr_dev(rect0, "y", "340.375");
    			attr_dev(rect0, "width", "49");
    			attr_dev(rect0, "height", "37");
    			attr_dev(rect0, "rx", "3");
    			attr_dev(rect0, "fill", "white");
    			attr_dev(rect0, "stroke", "black");
    			attr_dev(rect0, "stroke-width", "2");
    			add_location(rect0, file$3, 172, 1, 4059);
    			attr_dev(path7, "id", "Vector 24");
    			attr_dev(path7, "d", "M41.8845 371.253V375.164C41.8845 375.164 41.8001 376.18 42.6465 376.891C43.4928 377.602 44.4243 377.602 44.4243 377.602C45.8296 377.653 48.8028 377.724 49.4529 377.602C50.1031 377.48 50.4163 377.45 50.8244 376.891C51.2325 376.333 51.4847 375.164 51.4847 375.164L51.8911 362.059C51.8911 362.059 55.2435 363.6 55.5483 363.634C55.853 363.668 56.5946 363.715 57.1229 363.634C57.6512 363.553 62.2735 362.382 62.7103 362.059C63.1471 361.736 63.5436 360.97 63.3706 360.231C63.1636 359.346 62.1797 358.647 61.4912 358.859C60.8027 359.071 58.4895 360.418 56.4626 360.231C54.7274 360.07 53.8517 359.113 52.3482 358.504C50.8447 357.894 49.7916 358.013 49.4529 358.148C48.6402 359.215 46.8827 361.307 46.3545 361.145C45.8262 360.982 44.5767 359.079 44.0179 358.148C43.0867 358.453 41.0515 359.296 40.3607 360.231C39.4972 361.399 40.9194 370.237 40.9194 370.237C40.9194 370.237 41.0842 370.526 41.2195 370.688C41.4374 370.95 41.8845 371.253 41.8845 371.253Z");
    			attr_dev(path7, "fill", "black");
    			attr_dev(path7, "stroke", "black");
    			add_location(path7, file$3, 183, 1, 4204);
    			attr_dev(path8, "id", "Vector 25");
    			attr_dev(path8, "d", "M44.7172 348.779C45.405 348.33 46.7619 348.287 46.7619 348.287C47.2382 348.287 48.4493 348.471 48.8804 348.779C49.3116 349.087 49.989 349.962 50.1368 350.652C50.2846 351.341 50.3376 353.401 49.4963 354.815C48.7774 356.023 47.5256 357.155 46.7619 357.155C45.9982 357.155 44.9439 356.115 44.0767 354.815C43.2096 353.514 43.2556 351.497 43.387 350.652C43.5184 349.806 43.9662 349.27 44.7172 348.779Z");
    			attr_dev(path8, "fill", "black");
    			attr_dev(path8, "stroke", "black");
    			add_location(path8, file$3, 189, 1, 5215);
    			attr_dev(path9, "d", "M46.3696 362.101L45.678 361.409L46.3696 360.717L47.0612 361.409L46.3696 362.101Z");
    			attr_dev(path9, "fill", "white");
    			add_location(path9, file$3, 196, 2, 5699);
    			attr_dev(path10, "d", "M45.678 367.633L46.3696 362.31L47.0612 367.633L46.3696 368.975L45.678 367.633Z");
    			attr_dev(path10, "fill", "white");
    			add_location(path10, file$3, 200, 2, 5816);
    			attr_dev(path11, "d", "M46.3696 362.101L45.678 361.409L46.3696 360.717L47.0612 361.409L46.3696 362.101Z");
    			attr_dev(path11, "stroke", "white");
    			add_location(path11, file$3, 204, 2, 5931);
    			attr_dev(path12, "d", "M45.678 367.633L46.3696 362.31L47.0612 367.633L46.3696 368.975L45.678 367.633Z");
    			attr_dev(path12, "stroke", "white");
    			add_location(path12, file$3, 208, 2, 6050);
    			attr_dev(g8, "id", "Vector 51");
    			add_location(g8, file$3, 195, 1, 5678);
    			attr_dev(rect1, "id", "Rectangle 30");
    			attr_dev(rect1, "x", "67.053");
    			attr_dev(rect1, "y", "355.191");
    			attr_dev(rect1, "width", "4");
    			attr_dev(rect1, "height", "8");
    			attr_dev(rect1, "stroke", "black");
    			add_location(rect1, file$3, 213, 1, 6172);
    			attr_dev(rect2, "id", "Rectangle 31");
    			attr_dev(rect2, "x", "71.053");
    			attr_dev(rect2, "y", "351.192");
    			attr_dev(rect2, "width", "4");
    			attr_dev(rect2, "height", "11.9991");
    			attr_dev(rect2, "stroke", "black");
    			add_location(rect2, file$3, 221, 1, 6272);
    			attr_dev(rect3, "id", "Rectangle 32");
    			attr_dev(rect3, "x", "75.053");
    			attr_dev(rect3, "y", "348.787");
    			attr_dev(rect3, "width", "4");
    			attr_dev(rect3, "height", "14.4044");
    			attr_dev(rect3, "stroke", "black");
    			add_location(rect3, file$3, 229, 1, 6378);
    			attr_dev(path13, "id", "Arrow 1");
    			attr_dev(path13, "d", "M75 345.949L72.1134 345.981L73.585 348.465L75 345.949ZM66.4944 351.279L73.1917 347.311L72.9368 346.881L66.2396 350.849L66.4944 351.279Z");
    			attr_dev(path13, "fill", "black");
    			add_location(path13, file$3, 237, 1, 6484);
    			attr_dev(path14, "id", "Arrow 2");
    			attr_dev(path14, "d", "M66.367 351.064L73.2754 346.971");
    			attr_dev(path14, "stroke", "black");
    			attr_dev(path14, "stroke-width", "1.5");
    			add_location(path14, file$3, 242, 1, 6667);
    			attr_dev(g9, "id", "work_presentation");
    			attr_dev(g9, "class", g9_class_value = "" + (null_to_empty(checkedClass(/*checked*/ ctx[0], "work_presentation")) + " svelte-1iokz0g"));
    			add_location(g9, file$3, 117, 0, 2606);
    			attr_dev(circle10, "id", "Ellipse 3_3");
    			attr_dev(circle10, "cx", "66");
    			attr_dev(circle10, "cy", "170");
    			attr_dev(circle10, "r", "49.5");
    			attr_dev(circle10, "fill", "#FCB941");
    			attr_dev(circle10, "stroke", "black");
    			add_location(circle10, file$3, 254, 1, 6894);
    			attr_dev(path15, "id", "Vector 22");
    			attr_dev(path15, "d", "M28.4902 188.019H56.2431C56.2431 188.019 56.5322 188.778 56.8709 189.156C57.3943 189.739 58.6466 190.09 58.6466 190.09L74.8151 190.09C74.8151 190.09 75.3854 189.658 75.6251 189.28C75.9024 188.843 76.0301 188.019 76.0301 188.019L104.134 188.019C104.134 188.019 103.4 190.838 102.292 192.177C100.991 193.75 97.9708 194.567 97.9708 194.567C97.9708 194.567 54.4884 195.166 34.6731 194.567C34.6731 194.567 31.3036 193.388 30.079 191.617C29.166 190.296 28.4902 188.019 28.4902 188.019Z");
    			attr_dev(path15, "fill", "black");
    			attr_dev(path15, "stroke", "black");
    			add_location(path15, file$3, 262, 1, 6992);
    			attr_dev(path16, "id", "Vector 23");
    			attr_dev(path16, "d", "M95.8513 185.358H36.8229V150.141C36.8229 150.141 37.1595 148.611 37.7659 147.864C38.6851 146.731 41.1421 146.264 41.1421 146.264H92.3074C92.3074 146.264 94.0968 146.791 94.836 147.637C95.5303 148.431 95.8513 150.141 95.8513 150.141V185.358Z");
    			attr_dev(path16, "fill", "black");
    			attr_dev(path16, "stroke", "black");
    			add_location(path16, file$3, 268, 1, 7538);
    			attr_dev(rect4, "id", "Rectangle 4");
    			attr_dev(rect4, "x", "41.0632");
    			attr_dev(rect4, "y", "150.609");
    			attr_dev(rect4, "width", "50.7161");
    			attr_dev(rect4, "height", "30.6346");
    			attr_dev(rect4, "fill", "white");
    			add_location(rect4, file$3, 274, 1, 7845);
    			attr_dev(g10, "id", "work_individual");
    			attr_dev(g10, "class", g10_class_value = "" + (null_to_empty(checkedClass(/*checked*/ ctx[0], "work_individual")) + " svelte-1iokz0g"));
    			add_location(g10, file$3, 249, 0, 6773);
    			attr_dev(circle11, "id", "Ellipse 3_4");
    			attr_dev(circle11, "cx", "166");
    			attr_dev(circle11, "cy", "170");
    			attr_dev(circle11, "r", "49.5");
    			attr_dev(circle11, "fill", "#ED8AFF");
    			attr_dev(circle11, "stroke", "black");
    			add_location(circle11, file$3, 288, 1, 8083);
    			attr_dev(rect5, "id", "Rectangle 6");
    			attr_dev(rect5, "x", "138.342");
    			attr_dev(rect5, "y", "153.371");
    			attr_dev(rect5, "width", "27");
    			attr_dev(rect5, "height", "37");
    			attr_dev(rect5, "fill", "white");
    			attr_dev(rect5, "stroke", "black");
    			attr_dev(rect5, "stroke-width", "2");
    			add_location(rect5, file$3, 296, 1, 8182);
    			attr_dev(rect6, "id", "Rectangle 7");
    			attr_dev(rect6, "x", "167.342");
    			attr_dev(rect6, "y", "153.371");
    			attr_dev(rect6, "width", "27");
    			attr_dev(rect6, "height", "37");
    			attr_dev(rect6, "fill", "white");
    			attr_dev(rect6, "stroke", "black");
    			attr_dev(rect6, "stroke-width", "2");
    			add_location(rect6, file$3, 306, 1, 8318);
    			attr_dev(path17, "id", "Vector 26");
    			attr_dev(path17, "d", "M155.057 148.99C159.412 149.865 165.868 152.531 165.868 152.531V190.649C165.868 190.649 159.623 187.391 153.193 186.921C146.093 186.401 141.17 187.201 141.17 186.921V148.244C141.17 148.244 149.732 147.919 155.057 148.99Z");
    			attr_dev(path17, "fill", "white");
    			attr_dev(path17, "stroke", "black");
    			add_location(path17, file$3, 317, 2, 8473);
    			attr_dev(path18, "id", "Vector 27");
    			attr_dev(path18, "d", "M146.576 157.377C147.694 157.315 150.937 157.377 154.963 158.123C158.99 158.868 160.804 159.676 161.208 159.987");
    			attr_dev(path18, "stroke", "black");
    			add_location(path18, file$3, 323, 2, 8766);
    			attr_dev(path19, "id", "Vector 28");
    			attr_dev(path19, "d", "M146.576 162.377C147.694 162.315 150.937 162.377 154.963 163.123C158.99 163.868 160.804 164.676 161.208 164.987");
    			attr_dev(path19, "stroke", "black");
    			add_location(path19, file$3, 328, 2, 8934);
    			attr_dev(path20, "id", "Vector 29");
    			attr_dev(path20, "d", "M146.576 167.377C147.694 167.315 150.937 167.377 154.963 168.123C158.99 168.868 160.804 169.676 161.208 169.987");
    			attr_dev(path20, "stroke", "black");
    			add_location(path20, file$3, 333, 2, 9102);
    			attr_dev(path21, "id", "Vector 30");
    			attr_dev(path21, "d", "M146.576 172.377C147.694 172.315 150.937 172.377 154.963 173.123C158.99 173.868 160.804 174.676 161.208 174.987");
    			attr_dev(path21, "stroke", "black");
    			add_location(path21, file$3, 338, 2, 9270);
    			attr_dev(path22, "id", "Vector 31");
    			attr_dev(path22, "d", "M146.576 177.377C147.694 177.315 150.937 177.377 154.963 178.123C158.99 178.868 160.804 179.676 161.208 179.987");
    			attr_dev(path22, "stroke", "black");
    			add_location(path22, file$3, 343, 2, 9438);
    			attr_dev(g11, "id", "Group 6");
    			add_location(g11, file$3, 316, 1, 8454);
    			attr_dev(path23, "id", "Vector 26_2");
    			attr_dev(path23, "d", "M176.678 148.99C172.323 149.865 165.868 152.531 165.868 152.531V190.649C165.868 190.649 172.112 187.391 178.542 186.921C185.642 186.401 190.565 187.201 190.565 186.921V148.244C190.565 148.244 182.003 147.919 176.678 148.99Z");
    			attr_dev(path23, "fill", "white");
    			attr_dev(path23, "stroke", "black");
    			add_location(path23, file$3, 350, 2, 9630);
    			attr_dev(path24, "id", "Vector 27_2");
    			attr_dev(path24, "d", "M185.159 157.377C184.041 157.315 180.798 157.377 176.772 158.123C172.746 158.868 170.931 159.676 170.528 159.987");
    			attr_dev(path24, "stroke", "black");
    			add_location(path24, file$3, 356, 2, 9928);
    			attr_dev(path25, "id", "Vector 28_2");
    			attr_dev(path25, "d", "M185.159 162.377C184.041 162.315 180.798 162.377 176.772 163.123C172.746 163.868 170.931 164.676 170.528 164.987");
    			attr_dev(path25, "stroke", "black");
    			add_location(path25, file$3, 361, 2, 10099);
    			attr_dev(path26, "id", "Vector 29_2");
    			attr_dev(path26, "d", "M185.159 167.377C184.041 167.315 180.798 167.377 176.772 168.123C172.746 168.868 170.931 169.676 170.528 169.987");
    			attr_dev(path26, "stroke", "black");
    			add_location(path26, file$3, 366, 2, 10270);
    			attr_dev(path27, "id", "Vector 30_2");
    			attr_dev(path27, "d", "M185.159 172.377C184.041 172.315 180.798 172.377 176.772 173.123C172.746 173.868 170.931 174.676 170.528 174.987");
    			attr_dev(path27, "stroke", "black");
    			add_location(path27, file$3, 371, 2, 10441);
    			attr_dev(path28, "id", "Vector 31_2");
    			attr_dev(path28, "d", "M185.159 177.377C184.041 177.315 180.798 177.377 176.772 178.123C172.746 178.868 170.931 179.676 170.528 179.987");
    			attr_dev(path28, "stroke", "black");
    			add_location(path28, file$3, 376, 2, 10612);
    			attr_dev(g12, "id", "Group 7");
    			add_location(g12, file$3, 349, 1, 9611);
    			attr_dev(g13, "id", "development_read");
    			attr_dev(g13, "class", g13_class_value = "" + (null_to_empty(checkedClass(/*checked*/ ctx[0], "development_read")) + " svelte-1iokz0g"));
    			add_location(g13, file$3, 283, 0, 7959);
    			attr_dev(circle12, "id", "Ellipse 3_5");
    			attr_dev(circle12, "cx", "166");
    			attr_dev(circle12, "cy", "270");
    			attr_dev(circle12, "r", "49.5");
    			attr_dev(circle12, "fill", "#ED8AFF");
    			attr_dev(circle12, "stroke", "black");
    			add_location(circle12, file$3, 388, 1, 10919);
    			attr_dev(circle13, "id", "Ellipse 8_8");
    			attr_dev(circle13, "cx", "182.45");
    			attr_dev(circle13, "cy", "292.356");
    			attr_dev(circle13, "r", "6.23163");
    			attr_dev(circle13, "fill", "black");
    			add_location(circle13, file$3, 397, 2, 11039);
    			attr_dev(path29, "id", "Ellipse 9_8");
    			attr_dev(path29, "d", "M191.332 306.297C191.332 303.955 190.402 301.71 188.747 300.055C187.092 298.399 184.846 297.469 182.505 297.469C180.164 297.469 177.919 298.399 176.263 300.055C174.608 301.71 173.678 303.955 173.678 306.297L182.505 306.297H191.332Z");
    			attr_dev(path29, "fill", "black");
    			add_location(path29, file$3, 404, 2, 11136);
    			attr_dev(g14, "id", "Group 5_2");
    			add_location(g14, file$3, 396, 1, 11018);
    			attr_dev(circle14, "id", "Ellipse 8_9");
    			attr_dev(circle14, "cx", "166.45");
    			attr_dev(circle14, "cy", "292.356");
    			attr_dev(circle14, "r", "6.23163");
    			attr_dev(circle14, "fill", "black");
    			add_location(circle14, file$3, 411, 2, 11450);
    			attr_dev(path30, "id", "Ellipse 9_9");
    			attr_dev(path30, "d", "M175.332 306.297C175.332 303.955 174.402 301.71 172.747 300.055C171.092 298.399 168.846 297.469 166.505 297.469C164.164 297.469 161.919 298.399 160.263 300.055C158.608 301.71 157.678 303.955 157.678 306.297L166.505 306.297H175.332Z");
    			attr_dev(path30, "fill", "black");
    			add_location(path30, file$3, 418, 2, 11547);
    			attr_dev(g15, "id", "Group 3_3");
    			add_location(g15, file$3, 410, 1, 11429);
    			attr_dev(circle15, "id", "Ellipse 8_10");
    			attr_dev(circle15, "cx", "150.45");
    			attr_dev(circle15, "cy", "292.356");
    			attr_dev(circle15, "r", "6.23163");
    			attr_dev(circle15, "fill", "black");
    			add_location(circle15, file$3, 425, 2, 11861);
    			attr_dev(path31, "id", "Ellipse 9_10");
    			attr_dev(path31, "d", "M159.332 306.297C159.332 303.955 158.402 301.71 156.747 300.055C155.092 298.399 152.846 297.469 150.505 297.469C148.164 297.469 145.919 298.399 144.263 300.055C142.608 301.71 141.678 303.955 141.678 306.297L150.505 306.297H159.332Z");
    			attr_dev(path31, "fill", "black");
    			add_location(path31, file$3, 432, 2, 11959);
    			attr_dev(g16, "id", "Group 4_3");
    			add_location(g16, file$3, 424, 1, 11840);
    			attr_dev(rect7, "id", "Rectangle 5_2");
    			attr_dev(rect7, "x", "141.487");
    			attr_dev(rect7, "y", "240.375");
    			attr_dev(rect7, "width", "49");
    			attr_dev(rect7, "height", "37");
    			attr_dev(rect7, "rx", "3");
    			attr_dev(rect7, "fill", "white");
    			attr_dev(rect7, "stroke", "black");
    			attr_dev(rect7, "stroke-width", "2");
    			add_location(rect7, file$3, 438, 1, 12253);
    			attr_dev(path32, "id", "Vector 24_2");
    			attr_dev(path32, "d", "M141.885 271.253V275.164C141.885 275.164 141.8 276.18 142.646 276.891C143.493 277.602 144.424 277.602 144.424 277.602C145.83 277.653 148.803 277.724 149.453 277.602C150.103 277.48 150.416 277.45 150.824 276.891C151.232 276.333 151.485 275.164 151.485 275.164L151.891 262.059C151.891 262.059 155.244 263.6 155.548 263.634C155.853 263.668 156.595 263.715 157.123 263.634C157.651 263.553 162.273 262.382 162.71 262.059C163.147 261.736 163.544 260.97 163.371 260.231C163.164 259.346 162.18 258.647 161.491 258.859C160.803 259.071 158.489 260.418 156.463 260.231C154.727 260.07 153.852 259.113 152.348 258.504C150.845 257.894 149.792 258.013 149.453 258.148C148.64 259.215 146.883 261.307 146.354 261.145C145.826 260.982 144.577 259.079 144.018 258.148C143.087 258.453 141.051 259.296 140.361 260.231C139.497 261.399 140.919 270.237 140.919 270.237C140.919 270.237 141.084 270.526 141.219 270.688C141.437 270.95 141.885 271.253 141.885 271.253Z");
    			attr_dev(path32, "fill", "black");
    			attr_dev(path32, "stroke", "black");
    			add_location(path32, file$3, 449, 1, 12400);
    			attr_dev(path33, "id", "Vector 25_2");
    			attr_dev(path33, "d", "M144.717 248.779C145.405 248.33 146.762 248.287 146.762 248.287C147.238 248.287 148.449 248.471 148.88 248.779C149.312 249.087 149.989 249.962 150.137 250.652C150.285 251.341 150.338 253.401 149.496 254.815C148.777 256.023 147.526 257.155 146.762 257.155C145.998 257.155 144.944 256.115 144.077 254.815C143.21 253.514 143.256 251.497 143.387 250.652C143.518 249.806 143.966 249.27 144.717 248.779Z");
    			attr_dev(path33, "fill", "black");
    			attr_dev(path33, "stroke", "black");
    			add_location(path33, file$3, 455, 1, 13408);
    			attr_dev(line0, "id", "Line 6");
    			attr_dev(line0, "x1", "166.671");
    			attr_dev(line0, "y1", "267.5");
    			attr_dev(line0, "x2", "182.671");
    			attr_dev(line0, "y2", "267.5");
    			attr_dev(line0, "stroke", "black");
    			add_location(line0, file$3, 461, 1, 13874);
    			attr_dev(line1, "id", "Line 5");
    			attr_dev(line1, "x1", "166.671");
    			attr_dev(line1, "y1", "263.5");
    			attr_dev(line1, "x2", "182.671");
    			attr_dev(line1, "y2", "263.5");
    			attr_dev(line1, "stroke", "black");
    			add_location(line1, file$3, 469, 1, 13972);
    			attr_dev(line2, "id", "Line 9");
    			attr_dev(line2, "x1", "166.671");
    			attr_dev(line2, "y1", "259.5");
    			attr_dev(line2, "x2", "182.671");
    			attr_dev(line2, "y2", "259.5");
    			attr_dev(line2, "stroke", "black");
    			add_location(line2, file$3, 477, 1, 14070);
    			attr_dev(line3, "id", "Line 7");
    			attr_dev(line3, "x1", "166.671");
    			attr_dev(line3, "y1", "255.5");
    			attr_dev(line3, "x2", "182.671");
    			attr_dev(line3, "y2", "255.5");
    			attr_dev(line3, "stroke", "black");
    			add_location(line3, file$3, 485, 1, 14168);
    			attr_dev(line4, "id", "Line 8");
    			attr_dev(line4, "x1", "161.727");
    			attr_dev(line4, "y1", "260.191");
    			attr_dev(line4, "x2", "166.069");
    			attr_dev(line4, "y2", "252.476");
    			attr_dev(line4, "stroke", "black");
    			add_location(line4, file$3, 493, 1, 14266);
    			attr_dev(path34, "id", "Aa");
    			attr_dev(path34, "d", "M167.973 253H167.049L169.72 245.727H170.629L173.299 253H172.376L170.203 246.878H170.146L167.973 253ZM168.314 250.159H172.035V250.94H168.314V250.159ZM175.924 253.128C175.578 253.128 175.264 253.063 174.983 252.933C174.701 252.8 174.477 252.609 174.311 252.361C174.146 252.11 174.063 251.807 174.063 251.452C174.063 251.139 174.124 250.886 174.247 250.692C174.371 250.495 174.535 250.341 174.741 250.23C174.947 250.119 175.174 250.036 175.423 249.982C175.674 249.925 175.926 249.88 176.179 249.847C176.511 249.804 176.779 249.772 176.985 249.751C177.194 249.727 177.345 249.688 177.44 249.634C177.537 249.579 177.586 249.484 177.586 249.349V249.321C177.586 248.971 177.49 248.698 177.298 248.504C177.109 248.31 176.821 248.213 176.435 248.213C176.035 248.213 175.721 248.301 175.494 248.476C175.267 248.651 175.107 248.838 175.015 249.037L174.219 248.753C174.361 248.421 174.551 248.163 174.787 247.979C175.026 247.792 175.287 247.661 175.568 247.588C175.853 247.512 176.132 247.474 176.407 247.474C176.582 247.474 176.783 247.496 177.01 247.538C177.24 247.579 177.461 247.663 177.674 247.79C177.89 247.918 178.068 248.111 178.211 248.369C178.353 248.627 178.424 248.973 178.424 249.406V253H177.586V252.261H177.543C177.486 252.38 177.391 252.506 177.259 252.641C177.126 252.776 176.95 252.891 176.73 252.986C176.51 253.08 176.241 253.128 175.924 253.128ZM176.051 252.375C176.383 252.375 176.662 252.31 176.89 252.18C177.119 252.049 177.292 251.881 177.408 251.675C177.526 251.469 177.586 251.253 177.586 251.026V250.259C177.55 250.301 177.472 250.34 177.351 250.376C177.233 250.409 177.095 250.438 176.939 250.464C176.785 250.488 176.635 250.509 176.488 250.528C176.344 250.545 176.227 250.559 176.137 250.571C175.919 250.599 175.715 250.646 175.526 250.71C175.339 250.771 175.187 250.865 175.071 250.99C174.958 251.113 174.901 251.281 174.901 251.494C174.901 251.786 175.009 252.006 175.224 252.155C175.442 252.302 175.718 252.375 176.051 252.375Z");
    			attr_dev(path34, "fill", "black");
    			add_location(path34, file$3, 501, 1, 14368);
    			attr_dev(g17, "id", "development_study");
    			attr_dev(g17, "class", g17_class_value = "" + (null_to_empty(checkedClass(/*checked*/ ctx[0], "development_study")) + " svelte-1iokz0g"));
    			add_location(g17, file$3, 383, 0, 10792);
    			attr_dev(circle16, "id", "Ellipse 3_6");
    			attr_dev(circle16, "cx", "166");
    			attr_dev(circle16, "cy", "370");
    			attr_dev(circle16, "r", "49.5");
    			attr_dev(circle16, "fill", "#4CD5B7");
    			attr_dev(circle16, "stroke", "black");
    			add_location(circle16, file$3, 512, 1, 16470);
    			attr_dev(circle17, "id", "Ellipse 11");
    			attr_dev(circle17, "cx", "167.208");
    			attr_dev(circle17, "cy", "369.018");
    			attr_dev(circle17, "r", "18");
    			attr_dev(circle17, "fill", "white");
    			attr_dev(circle17, "stroke", "black");
    			attr_dev(circle17, "stroke-width", "6");
    			add_location(circle17, file$3, 520, 1, 16569);
    			attr_dev(path35, "id", "Vector 33");
    			attr_dev(path35, "d", "M172.431 374.332C170.34 376.252 168.074 377.703 167.202 378.189C167.202 378.189 163.783 376.085 161.93 374.332C160.248 372.739 158.833 371.991 158.116 369.788C157.842 368.948 157.718 368.443 157.73 367.56C157.741 366.742 157.805 366.258 158.116 365.502C158.432 364.734 158.731 364.335 159.316 363.745C160.423 362.629 161.387 362.068 162.959 362.031C164.116 362.003 165.132 362.39 165.807 362.845C166.482 363.3 167.202 364.131 167.202 364.131C167.202 364.131 167.555 363.551 168.574 362.845C169.593 362.138 170.849 361.989 171.445 362.031C172.042 362.072 174.073 362.803 174.96 363.745C175.847 364.687 176.19 365.463 176.19 365.463C176.19 365.463 176.635 366.44 176.546 367.56C176.457 368.679 176.423 368.955 176.117 369.788C175.811 370.621 174.523 372.411 172.431 374.332Z");
    			attr_dev(path35, "fill", "black");
    			attr_dev(path35, "stroke", "black");
    			add_location(path35, file$3, 529, 1, 16690);
    			attr_dev(path36, "id", "Vector 34");
    			attr_dev(path36, "d", "M138.35 390.163C138.106 389.814 138.099 389.102 138.099 389.102L138.608 363.32C138.549 363.125 138.416 362.722 138.354 362.667C138.293 362.611 138.108 362.433 138.024 362.351L137.232 361.537L136.548 360.361L136.194 358.047L136.724 347.777H137.77V357.086C137.77 357.086 137.77 357.562 138.193 357.562C138.615 357.562 138.592 357.086 138.592 357.086V347.777H139.622V357.086C139.622 357.086 139.622 357.562 140.107 357.562C140.545 357.562 140.545 357.086 140.545 357.086V347.777H141.552V357.086C141.552 357.086 141.552 357.562 142.029 357.562C142.505 357.562 142.451 357.086 142.451 357.086V347.777H143.466C143.466 347.777 144.053 357.601 144.05 357.701C144.048 357.801 144.043 358.96 143.82 359.722C143.579 360.543 143.358 361.003 142.828 361.675C142.501 362.09 142.021 362.436 141.867 362.628C141.714 362.821 141.626 363.138 141.621 363.366C141.616 363.594 141.924 380.528 142.075 389.102C142.075 389.102 142.048 389.813 141.8 390.163C141.587 390.463 141.046 390.728 141.046 390.728H139.128C139.128 390.728 138.566 390.47 138.35 390.163Z");
    			attr_dev(path36, "fill", "black");
    			add_location(path36, file$3, 535, 1, 17529);
    			attr_dev(path37, "id", "Vector 35");
    			attr_dev(path37, "d", "M193.05 390.192C192.804 389.85 192.76 389.153 192.76 389.153L193.257 369.134C192.997 368.92 192.42 368.369 192.196 367.869C191.971 367.37 191.738 366.163 191.649 365.622C191.561 365.081 191.649 363.531 191.649 363.531C191.649 363.531 192.936 351.61 193.257 350.438C193.577 349.266 193.449 349.414 193.772 348.846C193.946 348.539 194.027 348.334 194.302 348.113C194.623 347.856 194.875 347.724 195.285 347.738C195.662 347.751 195.943 347.816 196.175 348.113C196.358 348.347 196.378 348.846 196.378 348.846L196.815 389.153C196.815 389.153 196.771 389.981 196.441 390.336C196.227 390.568 196.041 390.635 195.748 390.753C195.042 391.039 194.488 391.076 193.799 390.753C193.468 390.598 193.263 390.488 193.05 390.192Z");
    			attr_dev(path37, "fill", "black");
    			add_location(path37, file$3, 540, 1, 18615);
    			attr_dev(g18, "id", "health_food");
    			attr_dev(g18, "class", g18_class_value = "" + (null_to_empty(checkedClass(/*checked*/ ctx[0], "health_food")) + " svelte-1iokz0g"));
    			add_location(g18, file$3, 507, 0, 16361);
    			attr_dev(circle18, "id", "Ellipse 3_7");
    			attr_dev(circle18, "cx", "166");
    			attr_dev(circle18, "cy", "470");
    			attr_dev(circle18, "r", "49.5");
    			attr_dev(circle18, "fill", "#4CD5B7");
    			attr_dev(circle18, "stroke", "black");
    			add_location(circle18, file$3, 551, 1, 19496);
    			attr_dev(path38, "id", "Vector 33_2");
    			attr_dev(path38, "d", "M186.049 489.028C178.114 496.313 169.518 501.819 166.212 503.662C166.212 503.662 153.242 495.68 146.212 489.028C139.829 482.987 134.461 480.15 131.741 471.793C130.704 468.606 130.231 466.688 130.278 463.337C130.321 460.237 130.561 458.4 131.741 455.533C132.941 452.617 134.074 451.105 136.294 448.866C140.494 444.631 144.151 442.503 150.115 442.362C154.502 442.259 158.358 443.726 160.919 445.452C163.48 447.177 166.212 450.33 166.212 450.33C166.212 450.33 167.549 448.132 171.415 445.452C175.281 442.771 180.048 442.204 182.31 442.362C184.571 442.52 191.565 444.674 195.643 448.866C199.721 453.058 200.302 455.51 200.302 455.51C200.302 455.51 201.996 459.092 201.659 463.337C201.322 467.583 201.193 468.633 200.033 471.793C198.873 474.953 193.984 481.744 186.049 489.028Z");
    			attr_dev(path38, "fill", "white");
    			attr_dev(path38, "stroke", "black");
    			attr_dev(path38, "stroke-width", "5");
    			add_location(path38, file$3, 559, 1, 19595);
    			attr_dev(path39, "id", "Vector 36");
    			attr_dev(path39, "d", "M140.395 477.349H152.75L157.914 461.859L165.751 485.555L173.588 470.157L176.908 477.349H192.213");
    			attr_dev(path39, "stroke", "black");
    			attr_dev(path39, "stroke-width", "4");
    			add_location(path39, file$3, 566, 1, 20455);
    			attr_dev(g19, "id", "health_health");
    			attr_dev(g19, "class", g19_class_value = "" + (null_to_empty(checkedClass(/*checked*/ ctx[0], "health_health")) + " svelte-1iokz0g"));
    			add_location(g19, file$3, 546, 0, 19381);
    			attr_dev(circle19, "id", "Ellipse 3_8");
    			attr_dev(circle19, "cx", "266");
    			attr_dev(circle19, "cy", "170");
    			attr_dev(circle19, "r", "49.5");
    			attr_dev(circle19, "fill", "#4CD5B7");
    			attr_dev(circle19, "stroke", "black");
    			add_location(circle19, file$3, 578, 1, 20740);
    			attr_dev(path40, "d", "M237.624 189.677L262.227 186.355L285.722 183.982L286.671 186.355C286.671 186.355 288.789 188.915 288.57 190.785C288.274 193.308 283.665 195.057 283.665 195.057H237.624C237.624 195.057 235.948 193.723 235.883 192.525C235.813 191.224 237.624 189.677 237.624 189.677Z");
    			attr_dev(path40, "fill", "black");
    			add_location(path40, file$3, 587, 2, 20860);
    			attr_dev(path41, "d", "M246.326 163.888C246.326 163.888 248.167 158.915 250.598 156.768C252.939 154.7 257.876 153.446 257.876 153.446L262.227 155.107M277.811 162.306C277.811 162.306 272.773 163.809 270.216 162.306C267.986 160.995 268.682 158.274 266.577 156.768C265.098 155.71 262.227 155.107 262.227 155.107M262.227 155.107C262.227 155.107 258.316 161.305 257.876 165.787C257.725 167.324 256.926 168.635 257.876 169.742C258.825 170.85 263.888 171.799 264.679 174.489C265.47 177.178 262.227 186.355 262.227 186.355M262.227 186.355L237.624 189.677C237.624 189.677 235.813 191.224 235.883 192.525C235.948 193.723 237.624 195.057 237.624 195.057H283.665C283.665 195.057 288.274 193.308 288.57 190.785C288.789 188.915 286.671 186.355 286.671 186.355L285.722 183.982M262.227 186.355L285.722 183.982M285.722 183.982L289.835 161.515M289.835 161.515L296.006 155.107M289.835 161.515L283.665 167.685M254.869 174.489L252.022 177.178H242.37");
    			attr_dev(path41, "stroke", "black");
    			attr_dev(path41, "stroke-width", "4");
    			add_location(path41, file$3, 591, 2, 21161);
    			attr_dev(g20, "id", "Vector 50");
    			add_location(g20, file$3, 586, 1, 20839);
    			attr_dev(circle20, "id", "Ellipse 26");
    			attr_dev(circle20, "cx", "266.206");
    			attr_dev(circle20, "cy", "145.459");
    			attr_dev(circle20, "r", "7.36041");
    			attr_dev(circle20, "fill", "black");
    			add_location(circle20, file$3, 597, 1, 22130);
    			attr_dev(g21, "id", "health_cardio");
    			attr_dev(g21, "class", g21_class_value = "" + (null_to_empty(checkedClass(/*checked*/ ctx[0], "health_cardio")) + " svelte-1iokz0g"));
    			add_location(g21, file$3, 573, 0, 20625);
    			attr_dev(circle21, "id", "Ellipse 3_9");
    			attr_dev(circle21, "cx", "266");
    			attr_dev(circle21, "cy", "270");
    			attr_dev(circle21, "r", "49.5");
    			attr_dev(circle21, "fill", "#4CD5B7");
    			attr_dev(circle21, "stroke", "black");
    			add_location(circle21, file$3, 610, 1, 22339);
    			attr_dev(rect8, "id", "Rectangle 9");
    			attr_dev(rect8, "x", "237.764");
    			attr_dev(rect8, "y", "261.161");
    			attr_dev(rect8, "width", "7.41415");
    			attr_dev(rect8, "height", "20.5217");
    			attr_dev(rect8, "rx", "3");
    			attr_dev(rect8, "fill", "black");
    			add_location(rect8, file$3, 618, 1, 22438);
    			attr_dev(rect9, "id", "Rectangle 10");
    			attr_dev(rect9, "x", "245.528");
    			attr_dev(rect9, "y", "254.958");
    			attr_dev(rect9, "width", "7.76451");
    			attr_dev(rect9, "height", "32.928");
    			attr_dev(rect9, "rx", "3");
    			attr_dev(rect9, "fill", "black");
    			add_location(rect9, file$3, 627, 1, 22557);
    			attr_dev(rect10, "id", "Rectangle 11");
    			attr_dev(rect10, "x", "253.869");
    			attr_dev(rect10, "y", "266.416");
    			attr_dev(rect10, "width", "2.82647");
    			attr_dev(rect10, "height", "10.0124");
    			attr_dev(rect10, "fill", "black");
    			add_location(rect10, file$3, 636, 1, 22676);
    			attr_dev(rect11, "id", "Rectangle 12");
    			attr_dev(rect11, "x", "232.527");
    			attr_dev(rect11, "y", "267.657");
    			attr_dev(rect11, "width", "4.00351");
    			attr_dev(rect11, "height", "7.52959");
    			attr_dev(rect11, "rx", "2");
    			attr_dev(rect11, "fill", "black");
    			add_location(rect11, file$3, 644, 1, 22787);
    			attr_dev(rect12, "id", "Rectangle 13");
    			attr_dev(rect12, "x", "233.41");
    			attr_dev(rect12, "y", "267.657");
    			attr_dev(rect12, "width", "4.00351");
    			attr_dev(rect12, "height", "7.52959");
    			attr_dev(rect12, "rx", "0.7");
    			attr_dev(rect12, "fill", "black");
    			add_location(rect12, file$3, 653, 1, 22907);
    			attr_dev(rect13, "id", "Rectangle 9_2");
    			attr_dev(rect13, "width", "7.41415");
    			attr_dev(rect13, "height", "20.5217");
    			attr_dev(rect13, "rx", "3");
    			attr_dev(rect13, "transform", "matrix(-1 0 0 1 294.394 261.161)");
    			attr_dev(rect13, "fill", "black");
    			add_location(rect13, file$3, 662, 1, 23028);
    			attr_dev(rect14, "id", "Rectangle 10_2");
    			attr_dev(rect14, "width", "7.76451");
    			attr_dev(rect14, "height", "32.928");
    			attr_dev(rect14, "rx", "3");
    			attr_dev(rect14, "transform", "matrix(-1 0 0 1 286.63 254.958)");
    			attr_dev(rect14, "fill", "black");
    			add_location(rect14, file$3, 670, 1, 23168);
    			attr_dev(rect15, "id", "Rectangle 11_2");
    			attr_dev(rect15, "width", "2.82647");
    			attr_dev(rect15, "height", "10.0124");
    			attr_dev(rect15, "transform", "matrix(-1 0 0 1 278.289 266.416)");
    			attr_dev(rect15, "fill", "black");
    			add_location(rect15, file$3, 678, 1, 23307);
    			attr_dev(rect16, "id", "Rectangle 12_2");
    			attr_dev(rect16, "width", "4.00351");
    			attr_dev(rect16, "height", "7.52959");
    			attr_dev(rect16, "rx", "2");
    			attr_dev(rect16, "transform", "matrix(-1 0 0 1 299.63 267.657)");
    			attr_dev(rect16, "fill", "black");
    			add_location(rect16, file$3, 685, 1, 23439);
    			attr_dev(rect17, "id", "Rectangle 13_2");
    			attr_dev(rect17, "width", "4.00351");
    			attr_dev(rect17, "height", "7.52959");
    			attr_dev(rect17, "rx", "0.7");
    			attr_dev(rect17, "transform", "matrix(-1 0 0 1 298.747 267.657)");
    			attr_dev(rect17, "fill", "black");
    			add_location(rect17, file$3, 693, 1, 23579);
    			attr_dev(rect18, "id", "Rectangle 14");
    			attr_dev(rect18, "x", "257.236");
    			attr_dev(rect18, "y", "268.855");
    			attr_dev(rect18, "width", "17.6851");
    			attr_dev(rect18, "height", "5.13438");
    			attr_dev(rect18, "fill", "black");
    			add_location(rect18, file$3, 701, 1, 23722);
    			attr_dev(g22, "id", "health_muscle");
    			attr_dev(g22, "class", g22_class_value = "" + (null_to_empty(checkedClass(/*checked*/ ctx[0], "health_muscle")) + " svelte-1iokz0g"));
    			add_location(g22, file$3, 605, 0, 22224);
    			attr_dev(circle22, "id", "Ellipse 3_10");
    			attr_dev(circle22, "cx", "266");
    			attr_dev(circle22, "cy", "370");
    			attr_dev(circle22, "r", "49.5");
    			attr_dev(circle22, "fill", "#4CD5B7");
    			attr_dev(circle22, "stroke", "black");
    			add_location(circle22, file$3, 715, 1, 23946);
    			attr_dev(path42, "id", "Vector 37");
    			attr_dev(path42, "d", "M279.644 343.996C281.399 343.854 284.005 345.139 284.005 345.139C284.005 345.139 283.379 345.804 283.044 346.281C282.675 346.806 282.452 347.107 282.232 347.71C282.037 348.245 281.94 349.138 281.94 349.138C281.94 349.138 281.28 348.845 280.836 348.716C280.292 348.558 279.408 348.456 279.408 348.456C279.408 348.456 279.386 349.031 279.408 349.398C279.443 349.987 279.495 350.32 279.644 350.891C279.881 351.802 280.23 352.238 280.609 353.1C280.95 353.874 281.161 354.333 281.486 355.079C281.81 355.826 283.478 356.062 284.765 356.67C285.888 357.2 286.541 357.449 287.654 358.001C288.904 358.621 290.803 359.689 290.803 359.689C290.803 359.689 292.578 359.656 293.693 359.462C294.926 359.247 296.777 358.585 296.777 358.585C296.777 358.585 297.478 358.373 297.556 358.001C297.628 357.657 297.166 357.189 297.166 357.189C297.166 357.189 296.496 356.335 295.998 355.852C295.416 355.289 294.374 354.56 294.374 354.56C294.374 354.56 295.208 353.444 295.478 352.612C295.773 351.704 295.705 350.178 295.705 350.178C295.705 350.178 297.269 351.148 298.173 351.898C298.987 352.573 299.444 352.967 300.121 353.781C300.744 354.531 301.119 354.962 301.517 355.852C301.871 356.647 302.109 357.132 302.101 358.001C302.094 358.844 301.89 359.323 301.517 360.079C301.12 360.881 300.815 361.332 300.121 361.897C299.412 362.473 298.86 362.57 298.01 362.903C296.702 363.417 295.92 363.596 294.537 363.845C293.27 364.073 291.258 364.169 291.258 364.169C291.258 364.169 289.035 365.938 287.654 367.124C285.898 368.633 284.869 369.441 283.271 371.117C282.061 372.386 281.489 373.193 280.349 374.526C279.753 375.223 279.41 375.606 278.824 376.311C278.23 377.026 278.071 377.601 277.33 378.162C276.945 378.453 276.708 378.602 276.259 378.779C275.729 378.988 275.4 379.074 274.83 379.071C274.273 379.068 273.434 378.779 273.434 378.779C273.434 378.779 270.894 377.14 269.149 376.311C267.373 375.468 266.323 375.098 264.442 374.526C262.402 373.906 261.227 373.627 259.117 373.325C256.717 372.98 255.341 372.975 252.916 373C250.884 373.021 249.727 372.99 247.722 373.325C246.594 373.513 244.865 373.974 244.865 373.974C244.865 373.974 243.957 373.861 243.437 373.617C242.689 373.265 242.277 372.926 241.846 372.221C241.416 371.518 241.276 370.998 241.326 370.175C241.367 369.511 241.502 369.122 241.846 368.552C242.278 367.838 242.726 367.562 243.437 367.124C244.885 366.232 247.722 366.345 247.722 366.345C247.722 366.345 251.996 366.04 254.735 366.117C257.189 366.187 258.574 366.261 261 366.637C263.247 366.985 264.503 367.255 266.682 367.903C267.961 368.284 269.916 369.011 269.916 369.011C269.916 369.011 271.026 368.201 271.686 367.621C272.642 366.781 273.184 366.294 273.954 365.28C274.818 364.141 275.223 363.419 275.754 362.091C276.405 360.46 276.521 359.442 276.718 357.701L276.719 357.686C276.8 356.973 276.849 355.852 276.849 355.852C276.849 355.852 276.085 354.201 275.706 353.1C275.32 351.981 275.053 351.352 274.901 350.178C274.761 349.096 274.581 348.427 274.901 347.384C275.209 346.379 275.583 345.819 276.383 345.139C277.412 344.266 278.299 344.105 279.644 343.996Z");
    			attr_dev(path42, "fill", "black");
    			add_location(path42, file$3, 723, 1, 24046);
    			attr_dev(path43, "id", "Vector 38");
    			attr_dev(path43, "d", "M265.351 365.923C267.145 366.6 269.831 367.935 269.831 367.935C269.831 367.935 267.128 366.968 265.351 366.507C262.195 365.689 260.356 365.441 257.105 365.208C254.373 365.013 252.826 365.051 250.092 365.208C248.159 365.32 245.157 365.695 245.157 365.695C245.157 365.695 243.285 365.969 242.333 366.637C241.65 367.116 240.872 368.195 240.872 368.195C240.872 368.195 240.6 367.474 240.612 366.994C240.623 366.564 240.705 366.319 240.872 365.923C241.132 365.306 241.411 365.004 241.911 364.559C242.337 364.18 243.145 363.78 243.145 363.78C243.145 363.78 247.373 363.327 250.092 363.325C252.836 363.324 254.391 363.369 257.105 363.78C260.394 364.278 262.238 364.748 265.351 365.923Z");
    			attr_dev(path43, "fill", "black");
    			add_location(path43, file$3, 728, 1, 27152);
    			attr_dev(path44, "id", "Vector 39");
    			attr_dev(path44, "d", "M284.281 371.328C285.877 369.747 288.589 367.517 288.589 367.517C288.589 367.517 286.196 370.495 284.778 372.488C283.297 374.569 282.495 375.76 281.188 377.955C279.983 379.979 278.316 383.257 278.316 383.257L273.401 393.972L270.639 392.149L275.223 382.65L265.834 377.016L260.201 385.853L257.716 384.141L263.404 375.139C263.404 375.139 265.086 375.747 266.166 376.133C267.136 376.48 267.709 376.6 268.651 377.016C269.826 377.535 271.523 378.618 271.523 378.618C271.523 378.618 272.586 379.477 273.401 379.723C274.392 380.021 275.06 380.021 276.052 379.723C276.866 379.477 277.93 378.618 277.93 378.618C277.93 378.618 279.649 376.471 280.801 375.139C282.12 373.615 282.849 372.746 284.281 371.328Z");
    			attr_dev(path44, "fill", "black");
    			add_location(path44, file$3, 733, 1, 27880);
    			attr_dev(path45, "id", "Vector 40");
    			attr_dev(path45, "d", "M273.566 387.51L262.962 380.883L261.913 382.484L272.572 389.001L273.566 387.51Z");
    			attr_dev(path45, "fill", "black");
    			add_location(path45, file$3, 738, 1, 28625);
    			attr_dev(circle23, "id", "Ellipse 12");
    			attr_dev(circle23, "cx", "288.76");
    			attr_dev(circle23, "cy", "350.395");
    			attr_dev(circle23, "r", "6.41817");
    			attr_dev(circle23, "fill", "black");
    			add_location(circle23, file$3, 743, 1, 28754);
    			attr_dev(path46, "id", "Rectangle 15");
    			attr_dev(path46, "d", "M234.243 375.316C234.243 374.212 235.139 373.316 236.243 373.316H240.876C241.468 373.316 242.021 373.59 242.473 373.972C242.868 374.305 243.383 374.642 243.853 374.642C245.743 374.642 249.602 374.104 250.352 373.997C250.438 373.985 250.519 373.956 250.593 373.911V373.911C251.03 373.649 251.585 373.964 251.585 374.473V388.437C251.585 389.542 250.69 390.437 249.585 390.437H236.243C235.139 390.437 234.243 389.542 234.243 388.437V375.316Z");
    			attr_dev(path46, "fill", "black");
    			add_location(path46, file$3, 744, 1, 28832);
    			attr_dev(rect19, "id", "Rectangle 16");
    			attr_dev(rect19, "x", "236.078");
    			attr_dev(rect19, "y", "390.379");
    			attr_dev(rect19, "width", "3.45509");
    			attr_dev(rect19, "height", "0.964739");
    			attr_dev(rect19, "fill", "black");
    			add_location(rect19, file$3, 749, 1, 29323);
    			attr_dev(rect20, "id", "Rectangle 17");
    			attr_dev(rect20, "x", "246.545");
    			attr_dev(rect20, "y", "390.379");
    			attr_dev(rect20, "width", "3.45509");
    			attr_dev(rect20, "height", "0.964739");
    			attr_dev(rect20, "fill", "black");
    			add_location(rect20, file$3, 757, 1, 29435);
    			attr_dev(g23, "id", "health_rest");
    			attr_dev(g23, "class", g23_class_value = "" + (null_to_empty(checkedClass(/*checked*/ ctx[0], "health_rest")) + " svelte-1iokz0g"));
    			add_location(g23, file$3, 710, 0, 23837);
    			attr_dev(circle24, "id", "Ellipse 3_11");
    			attr_dev(circle24, "cx", "266");
    			attr_dev(circle24, "cy", "470");
    			attr_dev(circle24, "r", "49.5");
    			attr_dev(circle24, "fill", "#4CD5B7");
    			attr_dev(circle24, "stroke", "black");
    			add_location(circle24, file$3, 771, 1, 29663);
    			attr_dev(path47, "id", "Vector 49");
    			attr_dev(path47, "d", "M242.603 451.794C245.332 446.712 253.488 439.43 253.488 441.678C253.488 443.927 250.915 447.577 250.831 451.794C250.736 456.496 251.224 459.261 252.887 463.66C255.143 469.626 257.316 473.072 262.38 476.95C268.433 481.584 273.43 482.855 281.05 482.646C285.605 482.521 292.442 480.114 292.442 480.114C292.197 481.758 288.062 486.549 284.056 489.291C279.171 492.635 275.573 493.785 269.658 494.037C262.858 494.328 258.591 493.005 252.887 489.291C246.187 484.928 242.912 480.521 240.705 472.836C238.427 464.906 238.7 459.063 242.603 451.794Z");
    			attr_dev(path47, "fill", "black");
    			attr_dev(path47, "stroke", "black");
    			add_location(path47, file$3, 779, 1, 29763);
    			attr_dev(path48, "id", "z");
    			attr_dev(path48, "d", "M269.249 468.654V468.142L271.726 464.961V464.915H269.328V464.29H272.59V464.824L270.18 467.983V468.029H272.669V468.654H269.249Z");
    			attr_dev(path48, "fill", "black");
    			add_location(path48, file$3, 785, 1, 30367);
    			attr_dev(path49, "id", "z_2");
    			attr_dev(path49, "d", "M276.503 458.313V457.674L279.6 453.696V453.64H276.603V452.858H280.679V453.526L277.668 457.475V457.532H280.779V458.313H276.503Z");
    			attr_dev(path49, "fill", "black");
    			add_location(path49, file$3, 790, 1, 30535);
    			attr_dev(path50, "id", "z_3");
    			attr_dev(path50, "d", "M285.684 448.968V448.137L289.71 442.967V442.893H285.814V441.877H291.113V442.745L287.199 447.879V447.953H291.243V448.968H285.684Z");
    			attr_dev(path50, "fill", "black");
    			add_location(path50, file$3, 795, 1, 30705);
    			attr_dev(g24, "id", "health_sleep");
    			attr_dev(g24, "class", g24_class_value = "" + (null_to_empty(checkedClass(/*checked*/ ctx[0], "health_sleep")) + " svelte-1iokz0g"));
    			add_location(g24, file$3, 766, 0, 29551);
    			attr_dev(circle25, "id", "Ellipse 3_12");
    			attr_dev(circle25, "cx", "366");
    			attr_dev(circle25, "cy", "170");
    			attr_dev(circle25, "r", "49.5");
    			attr_dev(circle25, "fill", "#4CD5B7");
    			attr_dev(circle25, "stroke", "black");
    			add_location(circle25, file$3, 806, 1, 30987);
    			attr_dev(rect21, "id", "Rectangle 23");
    			attr_dev(rect21, "x", "337.376");
    			attr_dev(rect21, "y", "145.133");
    			attr_dev(rect21, "width", "57.4388");
    			attr_dev(rect21, "height", "49.6862");
    			attr_dev(rect21, "rx", "2.5");
    			attr_dev(rect21, "fill", "#C4C4C4");
    			attr_dev(rect21, "stroke", "black");
    			attr_dev(rect21, "stroke-width", "3");
    			add_location(rect21, file$3, 814, 1, 31087);
    			attr_dev(line5, "id", "Line 3");
    			attr_dev(line5, "x1", "346.369");
    			attr_dev(line5, "y1", "145.057");
    			attr_dev(line5, "x2", "346.369");
    			attr_dev(line5, "y2", "195.057");
    			attr_dev(line5, "stroke", "black");
    			attr_dev(line5, "stroke-width", "2");
    			add_location(line5, file$3, 825, 1, 31247);
    			attr_dev(line6, "id", "Line 4");
    			attr_dev(line6, "x1", "385.412");
    			attr_dev(line6, "y1", "145.459");
    			attr_dev(line6, "x2", "385.412");
    			attr_dev(line6, "y2", "195.459");
    			attr_dev(line6, "stroke", "black");
    			attr_dev(line6, "stroke-width", "2");
    			add_location(line6, file$3, 834, 1, 31368);
    			attr_dev(rect22, "id", "Rectangle 24");
    			attr_dev(rect22, "x", "337.459");
    			attr_dev(rect22, "y", "154.392");
    			attr_dev(rect22, "width", "9.01835");
    			attr_dev(rect22, "height", "5.85402");
    			attr_dev(rect22, "fill", "black");
    			add_location(rect22, file$3, 843, 1, 31489);
    			attr_dev(rect23, "id", "Rectangle 25");
    			attr_dev(rect23, "x", "337.459");
    			attr_dev(rect23, "y", "167.392");
    			attr_dev(rect23, "width", "9.01835");
    			attr_dev(rect23, "height", "5.85402");
    			attr_dev(rect23, "fill", "black");
    			add_location(rect23, file$3, 851, 1, 31600);
    			attr_dev(rect24, "id", "Rectangle 26");
    			attr_dev(rect24, "x", "337.459");
    			attr_dev(rect24, "y", "180.392");
    			attr_dev(rect24, "width", "9.01835");
    			attr_dev(rect24, "height", "5.85402");
    			attr_dev(rect24, "fill", "black");
    			add_location(rect24, file$3, 859, 1, 31711);
    			attr_dev(rect25, "id", "Rectangle 27");
    			attr_dev(rect25, "x", "384.459");
    			attr_dev(rect25, "y", "154.392");
    			attr_dev(rect25, "width", "9.01835");
    			attr_dev(rect25, "height", "5.85402");
    			attr_dev(rect25, "fill", "black");
    			add_location(rect25, file$3, 867, 1, 31822);
    			attr_dev(rect26, "id", "Rectangle 28");
    			attr_dev(rect26, "x", "384.459");
    			attr_dev(rect26, "y", "167.392");
    			attr_dev(rect26, "width", "9.01835");
    			attr_dev(rect26, "height", "5.85402");
    			attr_dev(rect26, "fill", "black");
    			add_location(rect26, file$3, 875, 1, 31933);
    			attr_dev(rect27, "id", "Rectangle 29");
    			attr_dev(rect27, "x", "384.459");
    			attr_dev(rect27, "y", "180.392");
    			attr_dev(rect27, "width", "9.01835");
    			attr_dev(rect27, "height", "5.85402");
    			attr_dev(rect27, "fill", "black");
    			add_location(rect27, file$3, 883, 1, 32044);
    			attr_dev(path51, "id", "Polygon 3");
    			attr_dev(path51, "d", "M375.747 170.002C375.747 173.234 360.79 182.023 358.33 182.023C355.87 182.023 355.596 157.586 358.33 157.586C361.063 157.586 375.747 166.77 375.747 170.002Z");
    			attr_dev(path51, "fill", "black");
    			add_location(path51, file$3, 891, 1, 32155);
    			attr_dev(g25, "id", "health_fun");
    			attr_dev(g25, "class", g25_class_value = "" + (null_to_empty(checkedClass(/*checked*/ ctx[0], "health_fun")) + " svelte-1iokz0g"));
    			add_location(g25, file$3, 801, 0, 30881);
    			attr_dev(circle26, "id", "Ellipse 3_13");
    			attr_dev(circle26, "cx", "366");
    			attr_dev(circle26, "cy", "270");
    			attr_dev(circle26, "r", "49.5");
    			attr_dev(circle26, "fill", "#8C98FE");
    			attr_dev(circle26, "stroke", "black");
    			add_location(circle26, file$3, 902, 1, 32498);
    			attr_dev(circle27, "id", "Ellipse 17");
    			attr_dev(circle27, "cx", "366");
    			attr_dev(circle27, "cy", "270.283");
    			attr_dev(circle27, "r", "36.7715");
    			attr_dev(circle27, "fill", "black");
    			attr_dev(circle27, "fill-opacity", "0.6");
    			add_location(circle27, file$3, 910, 1, 32598);
    			attr_dev(circle28, "id", "Ellipse 14");
    			attr_dev(circle28, "cx", "354.664");
    			attr_dev(circle28, "cy", "258.917");
    			attr_dev(circle28, "r", "6.78171");
    			attr_dev(circle28, "fill", "white");
    			attr_dev(circle28, "stroke", "black");
    			attr_dev(circle28, "stroke-width", "2");
    			add_location(circle28, file$3, 918, 1, 32705);
    			attr_dev(circle29, "id", "Ellipse 15");
    			attr_dev(circle29, "cx", "377.58");
    			attr_dev(circle29, "cy", "254.275");
    			attr_dev(circle29, "r", "6.78171");
    			attr_dev(circle29, "fill", "white");
    			attr_dev(circle29, "stroke", "black");
    			attr_dev(circle29, "stroke-width", "2");
    			add_location(circle29, file$3, 927, 1, 32831);
    			attr_dev(path52, "id", "Vector 42");
    			attr_dev(path52, "d", "M342.96 274.24L336.22 290.048C336.22 290.048 349.928 306.224 366.612 306.224C383.296 306.224 387.322 297.766 387.322 297.766V280.489L393.695 293.112L396.758 288.332C396.758 288.332 390.363 270.834 388.67 268.602C386.984 266.378 386.403 266.096 384.524 265.181L384.504 265.171C381.984 263.945 380.198 264.191 377.396 264.191C374.594 264.191 372.822 263.974 370.288 265.171C368.678 265.931 367.755 266.502 366.612 267.867C365.636 269.033 364.774 271.298 364.774 271.298C364.774 271.298 361.794 269.002 360.852 268.602C359.91 268.203 354.846 268.203 354.846 268.203C354.846 268.203 351.23 267.918 349.088 268.602C347.242 269.192 346.253 269.89 344.921 271.298C343.973 272.301 342.96 274.24 342.96 274.24Z");
    			attr_dev(path52, "fill", "white");
    			attr_dev(path52, "stroke", "black");
    			attr_dev(path52, "stroke-width", "3");
    			add_location(path52, file$3, 936, 1, 32956);
    			attr_dev(circle30, "id", "Ellipse 16");
    			attr_dev(circle30, "cx", "366.489");
    			attr_dev(circle30, "cy", "282.737");
    			attr_dev(circle30, "r", "6.02508");
    			attr_dev(circle30, "fill", "black");
    			add_location(circle30, file$3, 943, 1, 33743);
    			attr_dev(path53, "id", "Vector 43");
    			attr_dev(path53, "d", "M360.933 289.635L352.38 285.655C352.38 285.655 349.976 284.972 349.416 285.993C348.959 286.827 349.966 288.365 349.966 288.365L355.175 292.472C355.175 292.472 358.054 294.886 359.028 295.944C360.002 297.003 360.368 298.439 360.51 300.433C360.651 302.426 360.623 303.764 360.51 305.429H372.79L373.128 300.433L374.568 295.944L377.829 292.472L383.333 288.365C383.333 288.365 384.316 286.75 383.757 285.993C383.21 285.255 381.428 285.655 381.428 285.655C381.428 285.655 376.55 288.441 373.128 289.423C370.628 290.141 369.167 290.59 366.565 290.567C364.336 290.547 360.933 289.635 360.933 289.635Z");
    			attr_dev(path53, "fill", "black");
    			attr_dev(path53, "stroke", "black");
    			add_location(path53, file$3, 950, 1, 33833);
    			attr_dev(g26, "id", "relationship_family");
    			attr_dev(g26, "class", g26_class_value = "" + (null_to_empty(checkedClass(/*checked*/ ctx[0], "relationship_family")) + " svelte-1iokz0g"));
    			add_location(g26, file$3, 897, 0, 32365);
    			attr_dev(circle31, "id", "Ellipse 3_14");
    			attr_dev(circle31, "cx", "366");
    			attr_dev(circle31, "cy", "370");
    			attr_dev(circle31, "r", "49.5");
    			attr_dev(circle31, "fill", "#8C98FE");
    			attr_dev(circle31, "stroke", "black");
    			add_location(circle31, file$3, 962, 1, 34641);
    			attr_dev(path54, "id", "Ellipse 18");
    			attr_dev(path54, "d", "M386.932 348.717C386.932 353.072 383.403 356.601 379.049 356.601C374.694 356.601 371.165 353.072 371.165 348.717C371.165 344.363 374.694 340.834 379.049 340.834C383.403 340.834 386.932 344.363 386.932 348.717Z");
    			attr_dev(path54, "fill", "white");
    			attr_dev(path54, "stroke", "black");
    			attr_dev(path54, "stroke-width", "2");
    			add_location(path54, file$3, 970, 1, 34741);
    			attr_dev(path55, "id", "Ellipse 19");
    			attr_dev(path55, "d", "M362.811 348.717C362.811 353.072 359.281 356.601 354.927 356.601C350.573 356.601 347.043 353.072 347.043 348.717C347.043 344.363 350.573 340.834 354.927 340.834C359.281 340.834 362.811 344.363 362.811 348.717Z");
    			attr_dev(path55, "fill", "white");
    			attr_dev(path55, "stroke", "black");
    			attr_dev(path55, "stroke-width", "2");
    			add_location(path55, file$3, 977, 1, 35037);
    			attr_dev(path56, "fill-rule", "evenodd");
    			attr_dev(path56, "clip-rule", "evenodd");
    			attr_dev(path56, "d", "M344.228 361.415C347.354 359.117 353.594 358.099 353.594 358.099H382.192C382.192 358.099 387.683 359.335 390.481 361.415C393.833 363.907 395.942 366.011 396.698 370.119C397.526 374.62 396.242 377.875 393.216 381.309C390.97 383.858 385.756 385.785 385.756 385.785C385.756 385.785 385.863 388.819 385.756 390.758C385.505 395.329 383.601 402.28 383.601 402.28H375.229C375.229 402.28 372.267 391.353 371.084 384.21C371.029 383.873 370.974 383.544 370.921 383.224C370.112 378.353 369.607 375.315 369.427 370.119C369.346 367.789 369.427 364.15 369.427 364.15H365.282C365.282 364.15 365.363 367.789 365.282 370.119C365.098 375.422 364.585 378.48 363.738 383.53L363.624 384.21C362.427 391.358 359.397 402.28 359.397 402.28H351.108C351.108 402.28 349.131 395.335 348.87 390.758C348.759 388.819 348.87 385.785 348.87 385.785C348.87 385.785 343.923 383.768 341.741 381.309C338.684 377.863 337.213 374.655 338.011 370.119C338.735 366.005 340.862 363.889 344.228 361.415ZM387.76 368.325C387.76 368.325 391.251 371.653 391.393 373.186C391.577 375.174 386.463 378.92 386.463 378.92L387.76 368.325ZM344.228 369.538C345.142 368.869 347.129 369.538 347.129 369.538V378.076L345.222 376.253C345.222 376.253 343.707 374.27 343.565 372.771C343.552 372.64 343.538 372.51 343.524 372.381C343.404 371.249 343.294 370.222 344.228 369.538Z");
    			attr_dev(path56, "fill", "white");
    			add_location(path56, file$3, 985, 2, 35354);
    			attr_dev(path57, "d", "M363.624 384.21C362.427 391.358 359.397 402.28 359.397 402.28H351.108C351.108 402.28 349.131 395.335 348.87 390.758C348.759 388.819 348.87 385.785 348.87 385.785C348.87 385.785 343.923 383.768 341.741 381.309C338.684 377.863 337.213 374.655 338.011 370.119C338.735 366.005 340.862 363.889 344.228 361.415C347.354 359.117 353.594 358.099 353.594 358.099H382.192C382.192 358.099 387.683 359.335 390.481 361.415C393.833 363.907 395.942 366.011 396.698 370.119C397.526 374.62 396.242 377.875 393.216 381.309C390.97 383.858 385.756 385.785 385.756 385.785C385.756 385.785 385.863 388.819 385.756 390.758C385.505 395.329 383.601 402.28 383.601 402.28H375.229C375.229 402.28 372.267 391.353 371.084 384.21C371.029 383.873 370.974 383.544 370.921 383.224C370.112 378.353 369.607 375.315 369.427 370.119C369.346 367.789 369.427 364.15 369.427 364.15H365.282C365.282 364.15 365.363 367.789 365.282 370.119C365.098 375.422 364.585 378.48 363.738 383.53M363.624 384.21C363.663 383.979 363.701 383.752 363.738 383.53M363.624 384.21L363.738 383.53M347.129 369.538C347.129 369.538 345.142 368.869 344.228 369.538C343.294 370.222 343.404 371.249 343.524 372.381C343.538 372.51 343.552 372.64 343.565 372.771C343.707 374.27 345.222 376.253 345.222 376.253L347.129 378.076V369.538ZM387.76 368.325C387.76 368.325 391.251 371.653 391.393 373.186C391.577 375.174 386.463 378.92 386.463 378.92L387.76 368.325Z");
    			attr_dev(path57, "stroke", "black");
    			attr_dev(path57, "stroke-width", "3");
    			add_location(path57, file$3, 991, 2, 36749);
    			attr_dev(g27, "id", "Vector 44");
    			add_location(g27, file$3, 984, 1, 35333);
    			attr_dev(path58, "id", "Vector 46");
    			attr_dev(path58, "d", "M376.432 353.675C378.545 354.313 381.93 352.367 381.93 352.367C381.93 352.367 378.759 352.554 376.909 352.017C375.114 351.496 372.612 349.685 372.612 349.685C372.612 349.685 374.367 353.051 376.432 353.675Z");
    			attr_dev(path58, "fill", "black");
    			add_location(path58, file$3, 997, 1, 38200);
    			attr_dev(path59, "id", "Vector 47");
    			attr_dev(path59, "d", "M356.731 354.118C358.902 353.721 361.026 350.446 361.026 350.446C361.026 350.446 358.291 352.058 356.4 352.425C354.564 352.781 351.511 352.311 351.511 352.311C351.511 352.311 354.609 354.505 356.731 354.118Z");
    			attr_dev(path59, "fill", "black");
    			add_location(path59, file$3, 1002, 1, 38456);
    			attr_dev(ellipse0, "id", "Ellipse 20");
    			attr_dev(ellipse0, "cx", "353.352");
    			attr_dev(ellipse0, "cy", "347.79");
    			attr_dev(ellipse0, "rx", "0.663108");
    			attr_dev(ellipse0, "ry", "1.53348");
    			attr_dev(ellipse0, "transform", "rotate(-9.33079 353.352 347.79)");
    			attr_dev(ellipse0, "fill", "black");
    			add_location(ellipse0, file$3, 1008, 2, 38733);
    			attr_dev(ellipse1, "id", "Ellipse 21");
    			attr_dev(ellipse1, "cx", "358.423");
    			attr_dev(ellipse1, "cy", "346.957");
    			attr_dev(ellipse1, "rx", "0.663108");
    			attr_dev(ellipse1, "ry", "1.53348");
    			attr_dev(ellipse1, "transform", "rotate(-9.33079 358.423 346.957)");
    			attr_dev(ellipse1, "fill", "black");
    			add_location(ellipse1, file$3, 1017, 2, 38895);
    			attr_dev(g28, "id", "Group 10");
    			add_location(g28, file$3, 1007, 1, 38713);
    			attr_dev(circle32, "id", "Ellipse 22");
    			attr_dev(circle32, "cx", "374.681");
    			attr_dev(circle32, "cy", "345.246");
    			attr_dev(circle32, "r", "2.5");
    			attr_dev(circle32, "fill", "black");
    			attr_dev(circle32, "fill-opacity", "0.8");
    			attr_dev(circle32, "stroke", "black");
    			add_location(circle32, file$3, 1027, 1, 39064);
    			attr_dev(circle33, "id", "Ellipse 23");
    			attr_dev(circle33, "cx", "381.161");
    			attr_dev(circle33, "cy", "347.21");
    			attr_dev(circle33, "r", "2.5");
    			attr_dev(circle33, "fill", "black");
    			attr_dev(circle33, "fill-opacity", "0.8");
    			attr_dev(circle33, "stroke", "black");
    			add_location(circle33, file$3, 1036, 1, 39188);
    			attr_dev(line7, "id", "Line 1");
    			attr_dev(line7, "x1", "377.041");
    			attr_dev(line7, "y1", "345.909");
    			attr_dev(line7, "x2", "378.844");
    			attr_dev(line7, "y2", "346.493");
    			attr_dev(line7, "stroke", "black");
    			add_location(line7, file$3, 1045, 1, 39311);
    			attr_dev(line8, "id", "Line 2");
    			attr_dev(line8, "x1", "383.483");
    			attr_dev(line8, "y1", "348.097");
    			attr_dev(line8, "x2", "388.084");
    			attr_dev(line8, "y2", "348.884");
    			attr_dev(line8, "stroke", "black");
    			add_location(line8, file$3, 1053, 1, 39413);
    			attr_dev(g29, "id", "relationship_friendship");
    			attr_dev(g29, "class", g29_class_value = "" + (null_to_empty(checkedClass(/*checked*/ ctx[0], "relationship_friendship")) + " svelte-1iokz0g"));
    			add_location(g29, file$3, 957, 0, 34496);
    			attr_dev(circle34, "id", "Ellipse 3_15");
    			attr_dev(circle34, "cx", "366");
    			attr_dev(circle34, "cy", "470");
    			attr_dev(circle34, "r", "49.5");
    			attr_dev(circle34, "fill", "#8C98FE");
    			attr_dev(circle34, "stroke", "black");
    			add_location(circle34, file$3, 1067, 1, 39643);
    			attr_dev(circle35, "id", "Ellipse 25");
    			attr_dev(circle35, "cx", "366.679");
    			attr_dev(circle35, "cy", "470.803");
    			attr_dev(circle35, "r", "41.9199");
    			attr_dev(circle35, "fill", "black");
    			attr_dev(circle35, "fill-opacity", "0.6");
    			attr_dev(circle35, "stroke", "black");
    			add_location(circle35, file$3, 1075, 1, 39743);
    			attr_dev(path60, "fill-rule", "evenodd");
    			attr_dev(path60, "clip-rule", "evenodd");
    			attr_dev(path60, "d", "M358.006 430.687C358.006 430.687 348.906 432.848 345.625 437.221C342.66 441.173 342.529 449.488 342.529 449.488V454.533C342.529 454.533 336.087 455.609 333.472 457.17C330.094 459.186 328.512 461.184 326.823 464.736C323.917 470.848 327.625 482.048 327.625 482.048C327.625 482.048 331.149 492.451 335.88 497.296C338.883 500.371 343.748 504.437 343.748 504.437C343.748 504.437 353.42 511.321 365.345 511.774C372.586 512.05 378.159 510.693 384.759 507.704C387.865 506.297 392.4 502.314 392.4 502.314C392.4 502.314 399.459 496.578 402.756 490.223C402.936 489.877 404.143 487.667 404.317 487.335C406.715 481.816 407.648 479.17 407.648 471.156C407.648 462.673 406.038 454.533 399.508 446.278C392.978 438.024 387.015 434.546 379.913 432.124C375.475 430.522 372.925 430.034 368.21 429.884C364.215 429.757 358.006 430.687 358.006 430.687ZM334.275 483.653C333.07 482.065 332.555 478.666 332.555 478.666C332.555 478.666 335.898 476.193 337.485 475.513C339.295 474.736 340.918 474.38 342.529 475.513C344.128 476.637 344.469 478.271 344.249 480.213C344.08 481.705 342.529 483.653 342.529 483.653L340.293 486.06C339.467 485.73 338.79 485.745 338.15 485.759C336.967 485.786 335.91 485.809 334.275 483.653Z");
    			attr_dev(path60, "fill", "white");
    			add_location(path60, file$3, 1085, 2, 39892);
    			attr_dev(path61, "d", "M378.528 500.85C378.528 500.85 385.876 496.852 388.731 492.595C391.973 487.761 392.478 483.97 392.4 478.15C392.345 474.041 390.336 467.832 390.336 467.832L383.572 473.449C383.572 473.449 378.236 470.609 374.515 470.468C370.88 470.332 365.458 472.647 365.458 472.647L363.223 478.666M378.528 500.85C378.528 500.85 374.16 501.291 371.42 500.85C366.399 500.04 359.726 495.117 359.726 495.117M378.528 500.85C378.528 500.85 381.871 502.291 384.145 502.684C386.837 503.149 392.4 502.314 392.4 502.314M359.726 495.117L355.331 486.143M359.726 495.117C359.726 495.117 355.86 494.782 353.42 495.117C350.544 495.512 348.218 495.105 346.312 497.296C344.623 499.237 343.748 504.437 343.748 504.437M355.331 486.143C355.331 486.143 349.922 488.913 346.312 488.468C343.8 488.158 342.644 487 340.293 486.06M355.331 486.143C355.331 486.143 358.396 484.687 360.127 483.202C362.03 481.569 363.223 478.666 363.223 478.666M343.748 504.437C343.748 504.437 353.42 511.321 365.345 511.774C372.586 512.05 378.159 510.693 384.759 507.704C387.865 506.297 392.4 502.314 392.4 502.314M343.748 504.437C343.748 504.437 338.883 500.371 335.88 497.296C331.149 492.451 327.625 482.048 327.625 482.048C327.625 482.048 323.917 470.848 326.823 464.736C328.512 461.184 330.094 459.186 333.472 457.17C336.087 455.609 342.529 454.533 342.529 454.533M392.4 502.314C392.4 502.314 399.459 496.578 402.756 490.223C402.936 489.877 404.143 487.667 404.317 487.335C406.715 481.816 407.648 479.17 407.648 471.156C407.648 462.673 406.038 454.533 399.508 446.278C392.978 438.024 387.015 434.546 379.913 432.124M366.261 438.024C366.261 438.024 370.372 441.635 371.42 444.788C372.436 447.847 370.987 449.848 371.42 453.042C371.85 456.218 372.134 458.738 373.598 460.953C375.062 463.168 377.862 465.512 381.394 465.539C384.597 465.563 386.64 464.297 388.731 461.87C391.063 459.163 391.398 456.605 391.675 453.042C391.952 449.48 391.115 444.843 388.731 440.431C386.474 436.253 384.218 434.128 379.913 432.124M379.913 432.124C375.475 430.522 372.925 430.034 368.21 429.884C364.215 429.757 358.006 430.687 358.006 430.687C358.006 430.687 348.906 432.848 345.625 437.221C342.66 441.173 342.529 449.488 342.529 449.488V454.533M363.051 453.042C363.051 453.042 359.06 449.444 356.287 450.176C355.024 450.509 354.251 450.889 353.42 451.896C352.099 453.498 352.733 457.17 352.733 457.17M332.555 478.666C332.555 478.666 333.587 474.252 334.275 473.449C334.962 472.647 340.924 459.348 340.924 459.348L342.529 454.533M332.555 478.666C332.555 478.666 333.07 482.065 334.275 483.653C335.91 485.809 336.967 485.786 338.15 485.759C338.79 485.745 339.467 485.73 340.293 486.06M332.555 478.666C332.555 478.666 335.898 476.193 337.485 475.513C339.295 474.736 340.918 474.38 342.529 475.513C344.128 476.637 344.469 478.271 344.249 480.213C344.08 481.705 342.529 483.653 342.529 483.653M342.529 483.653C342.529 483.653 341.167 485.12 340.293 486.06M342.529 483.653L340.293 486.06M363.223 478.666C363.223 478.666 365.651 477.839 367.178 478.15C369.214 478.564 371.42 481.36 371.42 481.36M380.133 481.36C380.133 481.36 382.102 479.335 383.572 479.64C384.874 479.91 385.98 482.048 385.98 482.048M376.561 484.455L375.776 486.977M375.776 486.977C375.776 486.977 376.495 489.26 377.725 489.729C379.141 490.268 381.394 488.468 381.394 488.468M375.776 486.977L374.739 484.555M375.776 486.977C375.776 486.977 374.137 489.758 372.452 489.729C370.801 489.7 369.241 486.977 369.241 486.977");
    			attr_dev(path61, "stroke", "black");
    			attr_dev(path61, "stroke-width", "3");
    			add_location(path61, file$3, 1091, 2, 41164);
    			attr_dev(g30, "id", "Vector 48");
    			add_location(g30, file$3, 1084, 1, 39871);
    			attr_dev(g31, "id", "relationship_pet");
    			attr_dev(g31, "class", g31_class_value = "" + (null_to_empty(checkedClass(/*checked*/ ctx[0], "relationship_pet")) + " svelte-1iokz0g"));
    			add_location(g31, file$3, 1062, 0, 39519);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, text0, anchor);
    			append_dev(text0, t0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, text1, anchor);
    			append_dev(text1, t2);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, g4, anchor);
    			append_dev(g4, circle0);
    			append_dev(g4, g0);
    			append_dev(g0, circle1);
    			append_dev(g0, path0);
    			append_dev(g4, g1);
    			append_dev(g1, circle2);
    			append_dev(g1, path1);
    			append_dev(g4, g2);
    			append_dev(g2, circle3);
    			append_dev(g2, path2);
    			append_dev(g4, g3);
    			append_dev(g3, circle4);
    			append_dev(g3, path3);
    			append_dev(g4, circle5);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, g9, anchor);
    			append_dev(g9, circle6);
    			append_dev(g9, g5);
    			append_dev(g5, circle7);
    			append_dev(g5, path4);
    			append_dev(g9, g6);
    			append_dev(g6, circle8);
    			append_dev(g6, path5);
    			append_dev(g9, g7);
    			append_dev(g7, circle9);
    			append_dev(g7, path6);
    			append_dev(g9, rect0);
    			append_dev(g9, path7);
    			append_dev(g9, path8);
    			append_dev(g9, g8);
    			append_dev(g8, path9);
    			append_dev(g8, path10);
    			append_dev(g8, path11);
    			append_dev(g8, path12);
    			append_dev(g9, rect1);
    			append_dev(g9, rect2);
    			append_dev(g9, rect3);
    			append_dev(g9, path13);
    			append_dev(g9, path14);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, g10, anchor);
    			append_dev(g10, circle10);
    			append_dev(g10, path15);
    			append_dev(g10, path16);
    			append_dev(g10, rect4);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, g13, anchor);
    			append_dev(g13, circle11);
    			append_dev(g13, rect5);
    			append_dev(g13, rect6);
    			append_dev(g13, g11);
    			append_dev(g11, path17);
    			append_dev(g11, path18);
    			append_dev(g11, path19);
    			append_dev(g11, path20);
    			append_dev(g11, path21);
    			append_dev(g11, path22);
    			append_dev(g13, g12);
    			append_dev(g12, path23);
    			append_dev(g12, path24);
    			append_dev(g12, path25);
    			append_dev(g12, path26);
    			append_dev(g12, path27);
    			append_dev(g12, path28);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, g17, anchor);
    			append_dev(g17, circle12);
    			append_dev(g17, g14);
    			append_dev(g14, circle13);
    			append_dev(g14, path29);
    			append_dev(g17, g15);
    			append_dev(g15, circle14);
    			append_dev(g15, path30);
    			append_dev(g17, g16);
    			append_dev(g16, circle15);
    			append_dev(g16, path31);
    			append_dev(g17, rect7);
    			append_dev(g17, path32);
    			append_dev(g17, path33);
    			append_dev(g17, line0);
    			append_dev(g17, line1);
    			append_dev(g17, line2);
    			append_dev(g17, line3);
    			append_dev(g17, line4);
    			append_dev(g17, path34);
    			insert_dev(target, t8, anchor);
    			insert_dev(target, g18, anchor);
    			append_dev(g18, circle16);
    			append_dev(g18, circle17);
    			append_dev(g18, path35);
    			append_dev(g18, path36);
    			append_dev(g18, path37);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, g19, anchor);
    			append_dev(g19, circle18);
    			append_dev(g19, path38);
    			append_dev(g19, path39);
    			insert_dev(target, t10, anchor);
    			insert_dev(target, g21, anchor);
    			append_dev(g21, circle19);
    			append_dev(g21, g20);
    			append_dev(g20, path40);
    			append_dev(g20, path41);
    			append_dev(g21, circle20);
    			insert_dev(target, t11, anchor);
    			insert_dev(target, g22, anchor);
    			append_dev(g22, circle21);
    			append_dev(g22, rect8);
    			append_dev(g22, rect9);
    			append_dev(g22, rect10);
    			append_dev(g22, rect11);
    			append_dev(g22, rect12);
    			append_dev(g22, rect13);
    			append_dev(g22, rect14);
    			append_dev(g22, rect15);
    			append_dev(g22, rect16);
    			append_dev(g22, rect17);
    			append_dev(g22, rect18);
    			insert_dev(target, t12, anchor);
    			insert_dev(target, g23, anchor);
    			append_dev(g23, circle22);
    			append_dev(g23, path42);
    			append_dev(g23, path43);
    			append_dev(g23, path44);
    			append_dev(g23, path45);
    			append_dev(g23, circle23);
    			append_dev(g23, path46);
    			append_dev(g23, rect19);
    			append_dev(g23, rect20);
    			insert_dev(target, t13, anchor);
    			insert_dev(target, g24, anchor);
    			append_dev(g24, circle24);
    			append_dev(g24, path47);
    			append_dev(g24, path48);
    			append_dev(g24, path49);
    			append_dev(g24, path50);
    			insert_dev(target, t14, anchor);
    			insert_dev(target, g25, anchor);
    			append_dev(g25, circle25);
    			append_dev(g25, rect21);
    			append_dev(g25, line5);
    			append_dev(g25, line6);
    			append_dev(g25, rect22);
    			append_dev(g25, rect23);
    			append_dev(g25, rect24);
    			append_dev(g25, rect25);
    			append_dev(g25, rect26);
    			append_dev(g25, rect27);
    			append_dev(g25, path51);
    			insert_dev(target, t15, anchor);
    			insert_dev(target, g26, anchor);
    			append_dev(g26, circle26);
    			append_dev(g26, circle27);
    			append_dev(g26, circle28);
    			append_dev(g26, circle29);
    			append_dev(g26, path52);
    			append_dev(g26, circle30);
    			append_dev(g26, path53);
    			insert_dev(target, t16, anchor);
    			insert_dev(target, g29, anchor);
    			append_dev(g29, circle31);
    			append_dev(g29, path54);
    			append_dev(g29, path55);
    			append_dev(g29, g27);
    			append_dev(g27, path56);
    			append_dev(g27, path57);
    			append_dev(g29, path58);
    			append_dev(g29, path59);
    			append_dev(g29, g28);
    			append_dev(g28, ellipse0);
    			append_dev(g28, ellipse1);
    			append_dev(g29, circle32);
    			append_dev(g29, circle33);
    			append_dev(g29, line7);
    			append_dev(g29, line8);
    			insert_dev(target, t17, anchor);
    			insert_dev(target, g31, anchor);
    			append_dev(g31, circle34);
    			append_dev(g31, circle35);
    			append_dev(g31, g30);
    			append_dev(g30, path60);
    			append_dev(g30, path61);

    			if (!mounted) {
    				dispose = [
    					listen_dev(g4, "click", /*click_handler*/ ctx[2], false, false, false),
    					listen_dev(g9, "click", /*click_handler_1*/ ctx[3], false, false, false),
    					listen_dev(g10, "click", /*click_handler_2*/ ctx[4], false, false, false),
    					listen_dev(g13, "click", /*click_handler_3*/ ctx[5], false, false, false),
    					listen_dev(g17, "click", /*click_handler_4*/ ctx[6], false, false, false),
    					listen_dev(g18, "click", /*click_handler_5*/ ctx[7], false, false, false),
    					listen_dev(g19, "click", /*click_handler_6*/ ctx[8], false, false, false),
    					listen_dev(g21, "click", /*click_handler_7*/ ctx[9], false, false, false),
    					listen_dev(g22, "click", /*click_handler_8*/ ctx[10], false, false, false),
    					listen_dev(g23, "click", /*click_handler_9*/ ctx[11], false, false, false),
    					listen_dev(g24, "click", /*click_handler_10*/ ctx[12], false, false, false),
    					listen_dev(g25, "click", /*click_handler_11*/ ctx[13], false, false, false),
    					listen_dev(g26, "click", /*click_handler_12*/ ctx[14], false, false, false),
    					listen_dev(g29, "click", /*click_handler_13*/ ctx[15], false, false, false),
    					listen_dev(g31, "click", /*click_handler_14*/ ctx[16], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*checked*/ 1 && g4_class_value !== (g4_class_value = "" + (null_to_empty(checkedClass(/*checked*/ ctx[0], "work_group")) + " svelte-1iokz0g"))) {
    				attr_dev(g4, "class", g4_class_value);
    			}

    			if (dirty & /*checked*/ 1 && g9_class_value !== (g9_class_value = "" + (null_to_empty(checkedClass(/*checked*/ ctx[0], "work_presentation")) + " svelte-1iokz0g"))) {
    				attr_dev(g9, "class", g9_class_value);
    			}

    			if (dirty & /*checked*/ 1 && g10_class_value !== (g10_class_value = "" + (null_to_empty(checkedClass(/*checked*/ ctx[0], "work_individual")) + " svelte-1iokz0g"))) {
    				attr_dev(g10, "class", g10_class_value);
    			}

    			if (dirty & /*checked*/ 1 && g13_class_value !== (g13_class_value = "" + (null_to_empty(checkedClass(/*checked*/ ctx[0], "development_read")) + " svelte-1iokz0g"))) {
    				attr_dev(g13, "class", g13_class_value);
    			}

    			if (dirty & /*checked*/ 1 && g17_class_value !== (g17_class_value = "" + (null_to_empty(checkedClass(/*checked*/ ctx[0], "development_study")) + " svelte-1iokz0g"))) {
    				attr_dev(g17, "class", g17_class_value);
    			}

    			if (dirty & /*checked*/ 1 && g18_class_value !== (g18_class_value = "" + (null_to_empty(checkedClass(/*checked*/ ctx[0], "health_food")) + " svelte-1iokz0g"))) {
    				attr_dev(g18, "class", g18_class_value);
    			}

    			if (dirty & /*checked*/ 1 && g19_class_value !== (g19_class_value = "" + (null_to_empty(checkedClass(/*checked*/ ctx[0], "health_health")) + " svelte-1iokz0g"))) {
    				attr_dev(g19, "class", g19_class_value);
    			}

    			if (dirty & /*checked*/ 1 && g21_class_value !== (g21_class_value = "" + (null_to_empty(checkedClass(/*checked*/ ctx[0], "health_cardio")) + " svelte-1iokz0g"))) {
    				attr_dev(g21, "class", g21_class_value);
    			}

    			if (dirty & /*checked*/ 1 && g22_class_value !== (g22_class_value = "" + (null_to_empty(checkedClass(/*checked*/ ctx[0], "health_muscle")) + " svelte-1iokz0g"))) {
    				attr_dev(g22, "class", g22_class_value);
    			}

    			if (dirty & /*checked*/ 1 && g23_class_value !== (g23_class_value = "" + (null_to_empty(checkedClass(/*checked*/ ctx[0], "health_rest")) + " svelte-1iokz0g"))) {
    				attr_dev(g23, "class", g23_class_value);
    			}

    			if (dirty & /*checked*/ 1 && g24_class_value !== (g24_class_value = "" + (null_to_empty(checkedClass(/*checked*/ ctx[0], "health_sleep")) + " svelte-1iokz0g"))) {
    				attr_dev(g24, "class", g24_class_value);
    			}

    			if (dirty & /*checked*/ 1 && g25_class_value !== (g25_class_value = "" + (null_to_empty(checkedClass(/*checked*/ ctx[0], "health_fun")) + " svelte-1iokz0g"))) {
    				attr_dev(g25, "class", g25_class_value);
    			}

    			if (dirty & /*checked*/ 1 && g26_class_value !== (g26_class_value = "" + (null_to_empty(checkedClass(/*checked*/ ctx[0], "relationship_family")) + " svelte-1iokz0g"))) {
    				attr_dev(g26, "class", g26_class_value);
    			}

    			if (dirty & /*checked*/ 1 && g29_class_value !== (g29_class_value = "" + (null_to_empty(checkedClass(/*checked*/ ctx[0], "relationship_friendship")) + " svelte-1iokz0g"))) {
    				attr_dev(g29, "class", g29_class_value);
    			}

    			if (dirty & /*checked*/ 1 && g31_class_value !== (g31_class_value = "" + (null_to_empty(checkedClass(/*checked*/ ctx[0], "relationship_pet")) + " svelte-1iokz0g"))) {
    				attr_dev(g31, "class", g31_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(text0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(text1);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(g4);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(g9);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(g10);
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(g13);
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(g17);
    			if (detaching) detach_dev(t8);
    			if (detaching) detach_dev(g18);
    			if (detaching) detach_dev(t9);
    			if (detaching) detach_dev(g19);
    			if (detaching) detach_dev(t10);
    			if (detaching) detach_dev(g21);
    			if (detaching) detach_dev(t11);
    			if (detaching) detach_dev(g22);
    			if (detaching) detach_dev(t12);
    			if (detaching) detach_dev(g23);
    			if (detaching) detach_dev(t13);
    			if (detaching) detach_dev(g24);
    			if (detaching) detach_dev(t14);
    			if (detaching) detach_dev(g25);
    			if (detaching) detach_dev(t15);
    			if (detaching) detach_dev(g26);
    			if (detaching) detach_dev(t16);
    			if (detaching) detach_dev(g29);
    			if (detaching) detach_dev(t17);
    			if (detaching) detach_dev(g31);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function checkedClass(checked, name) {
    	return checked.includes(name) ? "checked" : "unchecked";
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Aspectos', slots, []);
    	let { checked = [] } = $$props;

    	function check(element) {
    		if (checked.includes(element)) {
    			$$invalidate(0, checked = checked.filter(e => e !== element));
    		} else {
    			checked.push(element);
    		}

    		$$invalidate(0, checked);
    	}

    	const writable_props = ['checked'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Aspectos> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => check("work_group");
    	const click_handler_1 = () => check("work_presentation");
    	const click_handler_2 = () => check("work_individual");
    	const click_handler_3 = () => check("development_read");
    	const click_handler_4 = () => check("development_study");
    	const click_handler_5 = () => check("health_food");
    	const click_handler_6 = () => check("health_health");
    	const click_handler_7 = () => check("health_cardio");
    	const click_handler_8 = () => check("health_muscle");
    	const click_handler_9 = () => check("health_rest");
    	const click_handler_10 = () => check("health_sleep");
    	const click_handler_11 = () => check("health_fun");
    	const click_handler_12 = () => check("relationship_family");
    	const click_handler_13 = () => check("relationship_friendship");
    	const click_handler_14 = () => check("relationship_pet");

    	$$self.$$set = $$props => {
    		if ('checked' in $$props) $$invalidate(0, checked = $$props.checked);
    	};

    	$$self.$capture_state = () => ({ _: translation, checked, check, checkedClass });

    	$$self.$inject_state = $$props => {
    		if ('checked' in $$props) $$invalidate(0, checked = $$props.checked);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		checked,
    		check,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3,
    		click_handler_4,
    		click_handler_5,
    		click_handler_6,
    		click_handler_7,
    		click_handler_8,
    		click_handler_9,
    		click_handler_10,
    		click_handler_11,
    		click_handler_12,
    		click_handler_13,
    		click_handler_14
    	];
    }

    class Aspectos extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { checked: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Aspectos",
    			options,
    			id: create_fragment$3.name
    		});
    	}

    	get checked() {
    		throw new Error("<Aspectos>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set checked(value) {
    		throw new Error("<Aspectos>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    var SpeechRecognition = SpeechRecognition || webkitSpeechRecognition;
    var SpeechGrammarList = SpeechGrammarList || webkitSpeechGrammarList;
    var SpeechRecognitionEvent = SpeechRecognitionEvent || webkitSpeechRecognitionEvent;

    var recognition = new SpeechRecognition();
    let max_stops = 2;

    var recognition$1 = {
    	recording: false,
    	start(handler) {
    		const self = this;
    		max_stops = 2;
    		recognition.start();
    		recognition.onresult = function (event) {

    			// event is a SpeechRecognitionEvent object.
    			// It holds all the lines we have captured so far. 
    			// We only need the current one.
    			var current = event.resultIndex;

    			// Get a transcript of what was said.
    			var transcript = event.results[current][0].transcript;

    			handler.onchange(transcript);
    		};
    		recognition.onstart = function () {
    			self.recording = true;
    			self.onstart_cb();
    		};
    		recognition.onend = function () {
    			self.recording = false;
    			self.onend_cb();
    		};
    		recognition.onerror = function (event) {
    			if (event.error == 'no-speech') {
    				max_stops--;
    				if (max_stops < 1) {
    					recognition.stop();
    				}
    			}		};
    	},
    	stop() {
    		max_stops = 0;
    		recognition.stop();
    	},
    	toggle() {
    		if (this.recording) {
    			recognition.stop();
    		} else {
    			recognition.start();
    		}
    	},
    	onstart(cb) {
    		this.onstart_cb = cb;
    	},
    	onstart_cb() { },
    	onend(cb) {
    		this.onend_cb = cb;
    	},
    	onend_cb() { },
    };

    /// <reference types="@capacitor/cli" />
    /**
     * Day of the week. Used for scheduling notifications on a particular weekday.
     */
    var Weekday;
    (function (Weekday) {
        Weekday[Weekday["Sunday"] = 1] = "Sunday";
        Weekday[Weekday["Monday"] = 2] = "Monday";
        Weekday[Weekday["Tuesday"] = 3] = "Tuesday";
        Weekday[Weekday["Wednesday"] = 4] = "Wednesday";
        Weekday[Weekday["Thursday"] = 5] = "Thursday";
        Weekday[Weekday["Friday"] = 6] = "Friday";
        Weekday[Weekday["Saturday"] = 7] = "Saturday";
    })(Weekday || (Weekday = {}));

    const LocalNotifications = registerPlugin('LocalNotifications', {
        web: () => Promise.resolve().then(function () { return web; }).then(m => new m.LocalNotificationsWeb()),
    });

    /* src/components/Home.svelte generated by Svelte v3.46.6 */

    const { console: console_1 } = globals;
    const file$2 = "src/components/Home.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[53] = list[i];
    	child_ctx[55] = i;
    	return child_ctx;
    }

    // (721:4) {:else}
    function create_else_block(ctx) {
    	let path;

    	const block = {
    		c: function create() {
    			path = svg_element("path");
    			attr_dev(path, "id", "user-anonymous");
    			attr_dev(path, "d", "M101.071 130.293V130.088C101.075 129.384 101.138 128.822 101.259 128.404C101.383 127.985 101.564 127.647 101.802 127.39C102.039 127.132 102.325 126.899 102.659 126.689C102.909 126.528 103.132 126.361 103.329 126.188C103.526 126.015 103.683 125.824 103.8 125.615C103.917 125.401 103.975 125.164 103.975 124.902C103.975 124.625 103.909 124.381 103.776 124.172C103.643 123.963 103.464 123.802 103.239 123.689C103.017 123.576 102.772 123.52 102.502 123.52C102.241 123.52 101.993 123.578 101.76 123.695C101.526 123.808 101.335 123.977 101.186 124.202C101.037 124.423 100.957 124.699 100.945 125.029H98.4816C98.5017 124.224 98.6949 123.56 99.0611 123.037C99.4274 122.51 99.9123 122.117 100.516 121.86C101.12 121.598 101.786 121.467 102.514 121.467C103.315 121.467 104.023 121.6 104.639 121.866C105.255 122.127 105.738 122.508 106.088 123.007C106.438 123.506 106.613 124.107 106.613 124.812C106.613 125.283 106.535 125.701 106.378 126.067C106.225 126.43 106.01 126.752 105.732 127.033C105.454 127.311 105.126 127.563 104.748 127.788C104.43 127.977 104.168 128.174 103.963 128.38C103.762 128.585 103.611 128.822 103.51 129.092C103.414 129.362 103.363 129.694 103.359 130.088V130.293H101.071ZM102.267 134.157C101.864 134.157 101.52 134.016 101.234 133.734C100.953 133.449 100.814 133.107 100.818 132.708C100.814 132.314 100.953 131.976 101.234 131.694C101.52 131.412 101.864 131.271 102.267 131.271C102.649 131.271 102.985 131.412 103.275 131.694C103.565 131.976 103.712 132.314 103.716 132.708C103.712 132.974 103.641 133.217 103.504 133.439C103.371 133.656 103.196 133.831 102.979 133.964C102.762 134.093 102.524 134.157 102.267 134.157Z");
    			attr_dev(path, "fill", "black");
    			add_location(path, file$2, 721, 5, 23303);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, path, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(path);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(721:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (715:4) {#if user.email}
    function create_if_block$1(ctx) {
    	let path;

    	const block = {
    		c: function create() {
    			path = svg_element("path");
    			attr_dev(path, "id", "user-logged");
    			attr_dev(path, "d", "M96.4768 127.553L98.1792 125.844L100.974 128.591L107.174 122.415L108.889 124.124L100.974 131.996L96.4768 127.553Z");
    			attr_dev(path, "fill", "black");
    			add_location(path, file$2, 715, 5, 23106);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, path, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(path);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(715:4) {#if user.email}",
    		ctx
    	});

    	return block;
    }

    // (367:1) {#each focusTasks as task, index}
    function create_each_block$1(ctx) {
    	let g17;
    	let text0;

    	let t0_1_value = (/*task*/ ctx[53]
    	? new Date(/*task*/ ctx[53].time).toISOString().substring(11, 11 + 8)
    	: "") + "";

    	let t0_1;
    	let text1;
    	let t1_value = translation(/*task*/ ctx[53]?.status || "") + "";
    	let t1;
    	let foreignObject;
    	let p;
    	let t2_value = (/*task*/ ctx[53]?.title || translation("Sin tareas pendientes")) + "";
    	let t2;
    	let g0;
    	let circle0;
    	let path0;
    	let g0_style_value;
    	let g1;
    	let circle1;
    	let path1;
    	let g2;
    	let circle2;
    	let path2;
    	let g3;
    	let circle3;
    	let circle3_stroke_dasharray_value;
    	let text2;

    	let t3_value = (/*task*/ ctx[53]
    	? new Date(/*enlapsedTime*/ ctx[4]).toISOString().substr(14, 5)
    	: "") + "";

    	let t3;
    	let g4;
    	let circle4;
    	let path3;
    	let g4_style_value;
    	let g5;
    	let circle5;
    	let path4;
    	let g6;
    	let circle6;
    	let rect0;
    	let rect1;
    	let g7;
    	let circle7;
    	let path5;
    	let path6;
    	let g8;
    	let circle8;
    	let g9;
    	let circle9;
    	let rect2;
    	let g10;
    	let circle10;
    	let path7;
    	let g11;
    	let circle11;
    	let path8;
    	let g11_style_value;
    	let g12;
    	let circle12;
    	let path9;
    	let g13;
    	let circle13;
    	let path10;
    	let g14;
    	let circle14;
    	let path11;
    	let path12;
    	let g16;
    	let circle15;
    	let g15;
    	let mask;
    	let path13;
    	let path14;
    	let path15;
    	let circle16;
    	let g17_class_value;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*user*/ ctx[1].email) return create_if_block$1;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			g17 = svg_element("g");
    			text0 = svg_element("text");
    			t0_1 = text(t0_1_value);
    			text1 = svg_element("text");
    			t1 = text(t1_value);
    			foreignObject = svg_element("foreignObject");
    			p = document.createElementNS("http://www.w3.org/1999/xhtml", "p");
    			t2 = text(t2_value);
    			g0 = svg_element("g");
    			circle0 = svg_element("circle");
    			path0 = svg_element("path");
    			g1 = svg_element("g");
    			circle1 = svg_element("circle");
    			path1 = svg_element("path");
    			g2 = svg_element("g");
    			circle2 = svg_element("circle");
    			path2 = svg_element("path");
    			g3 = svg_element("g");
    			circle3 = svg_element("circle");
    			text2 = svg_element("text");
    			t3 = text(t3_value);
    			g4 = svg_element("g");
    			circle4 = svg_element("circle");
    			path3 = svg_element("path");
    			g5 = svg_element("g");
    			circle5 = svg_element("circle");
    			path4 = svg_element("path");
    			g6 = svg_element("g");
    			circle6 = svg_element("circle");
    			rect0 = svg_element("rect");
    			rect1 = svg_element("rect");
    			g7 = svg_element("g");
    			circle7 = svg_element("circle");
    			path5 = svg_element("path");
    			path6 = svg_element("path");
    			g8 = svg_element("g");
    			circle8 = svg_element("circle");
    			g9 = svg_element("g");
    			circle9 = svg_element("circle");
    			rect2 = svg_element("rect");
    			g10 = svg_element("g");
    			circle10 = svg_element("circle");
    			path7 = svg_element("path");
    			g11 = svg_element("g");
    			circle11 = svg_element("circle");
    			path8 = svg_element("path");
    			g12 = svg_element("g");
    			circle12 = svg_element("circle");
    			path9 = svg_element("path");
    			g13 = svg_element("g");
    			circle13 = svg_element("circle");
    			path10 = svg_element("path");
    			g14 = svg_element("g");
    			circle14 = svg_element("circle");
    			path11 = svg_element("path");
    			path12 = svg_element("path");
    			g16 = svg_element("g");
    			circle15 = svg_element("circle");
    			g15 = svg_element("g");
    			mask = svg_element("mask");
    			path13 = svg_element("path");
    			path14 = svg_element("path");
    			path15 = svg_element("path");
    			circle16 = svg_element("circle");
    			if_block.c();
    			attr_dev(text0, "id", "title");
    			attr_dev(text0, "x", "146");
    			attr_dev(text0, "y", "120");
    			attr_dev(text0, "font-size", "35");
    			attr_dev(text0, "font-weight", "800");
    			attr_dev(text0, "stroke", "black");
    			attr_dev(text0, "fill", "white");
    			add_location(text0, file$2, 368, 3, 8388);
    			attr_dev(text1, "id", "status");
    			attr_dev(text1, "x", "176");
    			attr_dev(text1, "y", "140");
    			attr_dev(text1, "font-size", "25");
    			attr_dev(text1, "font-weight", "800");
    			attr_dev(text1, "stroke", "black");
    			attr_dev(text1, "fill", "white");
    			add_location(text1, file$2, 379, 3, 8601);
    			attr_dev(p, "xmlns", "http://www.w3.org/1999/xhtml");
    			attr_dev(p, "class", "title");
    			add_location(p, file$2, 391, 4, 8842);
    			attr_dev(foreignObject, "id", "title");
    			attr_dev(foreignObject, "x", "41");
    			attr_dev(foreignObject, "y", "200");
    			attr_dev(foreignObject, "width", "350");
    			attr_dev(foreignObject, "height", "300");
    			add_location(foreignObject, file$2, 390, 3, 8771);
    			attr_dev(circle0, "id", "Ellipse 2");
    			attr_dev(circle0, "cx", "346");
    			attr_dev(circle0, "cy", "596");
    			attr_dev(circle0, "r", "49.5");
    			attr_dev(circle0, "fill", "#2CC990");
    			attr_dev(circle0, "stroke", "black");
    			add_location(circle0, file$2, 401, 4, 9092);
    			attr_dev(path0, "id", "Vector 1");
    			attr_dev(path0, "d", "M364.736 572.467L337.325 600.189L326.697 589.157C326.697 589.157 321.103 584.348 315.788 589.157C310.474 593.966 314.39 600.189 314.39 600.189L331.731 617.728C331.731 617.728 335.334 620.17 337.885 619.991C340.031 619.84 342.92 617.728 342.92 617.728L376.484 583.782C376.484 583.782 380.4 578.691 375.645 573.599C370.89 568.507 364.736 572.467 364.736 572.467Z");
    			attr_dev(path0, "fill", "white");
    			attr_dev(path0, "stroke", "black");
    			add_location(path0, file$2, 409, 4, 9213);
    			attr_dev(g0, "id", "check");
    			attr_dev(g0, "opacity", "0.75");
    			attr_dev(g0, "style", g0_style_value = `${!/*task*/ ctx[53] ? "display:none" : ""}`);
    			add_location(g0, file$2, 395, 3, 8978);
    			attr_dev(circle1, "id", "Ellipse 2");
    			attr_dev(circle1, "cx", "346");
    			attr_dev(circle1, "cy", "596");
    			attr_dev(circle1, "r", "49.5");
    			attr_dev(circle1, "fill", "#2C82C9");
    			attr_dev(circle1, "stroke", "black");
    			add_location(circle1, file$2, 417, 4, 9724);
    			attr_dev(path1, "id", "Vector 1");
    			attr_dev(path1, "d", "M364.736 572.467L337.325 600.189L326.697 589.157C326.697 589.157 321.103 584.348 315.788 589.157C310.474 593.966 314.39 600.189 314.39 600.189L331.731 617.728C331.731 617.728 335.334 620.17 337.885 619.991C340.031 619.84 342.92 617.728 342.92 617.728L376.484 583.782C376.484 583.782 380.4 578.691 375.645 573.599C370.89 568.507 364.736 572.467 364.736 572.467Z");
    			attr_dev(path1, "fill", "white");
    			attr_dev(path1, "stroke", "black");
    			add_location(path1, file$2, 425, 4, 9845);
    			attr_dev(g1, "id", "check_add");
    			attr_dev(g1, "opacity", "0.75");
    			add_location(g1, file$2, 416, 3, 9664);
    			attr_dev(circle2, "id", "Ellipse 2_2");
    			attr_dev(circle2, "cx", "210");
    			attr_dev(circle2, "cy", "708");
    			attr_dev(circle2, "r", "47");
    			attr_dev(circle2, "stroke", "#2CC990");
    			attr_dev(circle2, "stroke-width", "6");
    			add_location(circle2, file$2, 433, 4, 10334);
    			attr_dev(path2, "id", "Vector 1_2");
    			attr_dev(path2, "d", "M228.736 684.467L201.325 712.189L190.697 701.157C190.697 701.157 185.103 696.348 179.788 701.157C174.474 705.966 178.39 712.189 178.39 712.189L195.731 729.728C195.731 729.728 199.334 732.17 201.885 731.991C204.031 731.84 206.92 729.728 206.92 729.728L240.484 695.782C240.484 695.782 244.4 690.691 239.645 685.599C234.89 680.507 228.736 684.467 228.736 684.467Z");
    			attr_dev(path2, "fill", "white");
    			attr_dev(path2, "stroke", "#2CC990");
    			attr_dev(path2, "stroke-width", "6");
    			add_location(path2, file$2, 441, 4, 10459);
    			attr_dev(g2, "id", "completed");
    			attr_dev(g2, "opacity", "0.75");
    			add_location(g2, file$2, 432, 3, 10296);
    			attr_dev(circle3, "cx", "210");
    			attr_dev(circle3, "cy", "596");
    			attr_dev(circle3, "r", "56");
    			attr_dev(circle3, "fill", "transparent");
    			attr_dev(circle3, "stroke", "#2C82C9");
    			attr_dev(circle3, "stroke-width", "8");
    			attr_dev(circle3, "stroke-dasharray", circle3_stroke_dasharray_value = `calc(${/*enlapsedTime*/ ctx[4] / /*maxTime*/ ctx[9]} * ${2 * Math.PI * 56}) ${2 * Math.PI * 56}`);
    			set_style(circle3, "transform", "translate(210px, 596px) rotate(-90deg) translate(-210px, -596px)");
    			add_location(circle3, file$2, 450, 4, 10972);
    			attr_dev(text2, "id", "title");
    			attr_dev(text2, "x", "165");
    			attr_dev(text2, "y", "610");
    			attr_dev(text2, "font-size", "35");
    			attr_dev(text2, "font-weight", "800");
    			attr_dev(text2, "stroke", "black");
    			attr_dev(text2, "fill", "white");
    			add_location(text2, file$2, 462, 4, 11302);
    			attr_dev(g3, "id", "playing");
    			attr_dev(g3, "opacity", "0.75");
    			add_location(g3, file$2, 449, 3, 10936);
    			attr_dev(circle4, "id", "Ellipse 2_3");
    			attr_dev(circle4, "cx", "210");
    			attr_dev(circle4, "cy", "596");
    			attr_dev(circle4, "r", "49.5");
    			attr_dev(circle4, "fill", "#2C82C9");
    			attr_dev(circle4, "stroke", "black");
    			add_location(circle4, file$2, 482, 4, 11654);
    			attr_dev(path3, "id", "Vector 13");
    			attr_dev(path3, "d", "M189.171 563.791C185.845 566.211 185.845 569.563 185.845 569.563V622.881C185.845 622.881 186.348 626.889 190.541 628.848C194.733 630.808 197.682 628.848 197.682 628.848L240.239 602.434C240.239 602.434 242.927 600.282 242.88 596.075C242.833 591.868 240.239 589.912 240.239 589.912L197.682 563.791C197.682 563.791 192.905 561.074 189.171 563.791Z");
    			attr_dev(path3, "fill", "white");
    			attr_dev(path3, "stroke", "black");
    			add_location(path3, file$2, 490, 4, 11777);
    			attr_dev(g4, "id", "play");
    			attr_dev(g4, "opacity", "0.75");
    			attr_dev(g4, "style", g4_style_value = `${!/*task*/ ctx[53] ? "display:none" : ""}`);
    			add_location(g4, file$2, 476, 3, 11542);
    			attr_dev(circle5, "id", "Ellipse 2_3");
    			attr_dev(circle5, "cx", "210");
    			attr_dev(circle5, "cy", "596");
    			attr_dev(circle5, "r", "49.5");
    			attr_dev(circle5, "fill", "#2C82C9");
    			attr_dev(circle5, "stroke", "black");
    			add_location(circle5, file$2, 498, 4, 12271);
    			attr_dev(path4, "id", "Vector 13");
    			attr_dev(path4, "d", "M189.171 563.791C185.845 566.211 185.845 569.563 185.845 569.563V622.881C185.845 622.881 186.348 626.889 190.541 628.848C194.733 630.808 197.682 628.848 197.682 628.848L240.239 602.434C240.239 602.434 242.927 600.282 242.88 596.075C242.833 591.868 240.239 589.912 240.239 589.912L197.682 563.791C197.682 563.791 192.905 561.074 189.171 563.791Z");
    			attr_dev(path4, "fill", "white");
    			attr_dev(path4, "stroke", "black");
    			add_location(path4, file$2, 506, 4, 12394);
    			attr_dev(g5, "id", "add_play");
    			attr_dev(g5, "opacity", "0.75");
    			add_location(g5, file$2, 497, 3, 12213);
    			attr_dev(circle6, "id", "Ellipse 3_2");
    			attr_dev(circle6, "cx", "210");
    			attr_dev(circle6, "cy", "596");
    			attr_dev(circle6, "r", "49.5");
    			attr_dev(circle6, "fill", "#2C82C9");
    			attr_dev(circle6, "stroke", "black");
    			add_location(circle6, file$2, 514, 4, 12883);
    			attr_dev(rect0, "id", "Rectangle 1");
    			attr_dev(rect0, "x", "191.5");
    			attr_dev(rect0, "y", "577.5");
    			attr_dev(rect0, "width", "12");
    			attr_dev(rect0, "height", "37");
    			attr_dev(rect0, "fill", "white");
    			attr_dev(rect0, "stroke", "black");
    			add_location(rect0, file$2, 522, 4, 13006);
    			attr_dev(rect1, "id", "Rectangle 2");
    			attr_dev(rect1, "x", "216.5");
    			attr_dev(rect1, "y", "577.5");
    			attr_dev(rect1, "width", "12");
    			attr_dev(rect1, "height", "37");
    			attr_dev(rect1, "fill", "white");
    			attr_dev(rect1, "stroke", "black");
    			add_location(rect1, file$2, 531, 4, 13146);
    			attr_dev(g6, "id", "pause");
    			attr_dev(g6, "opacity", "0.75");
    			add_location(g6, file$2, 513, 3, 12830);
    			attr_dev(circle7, "id", "Ellipse 3_3");
    			attr_dev(circle7, "cx", "210");
    			attr_dev(circle7, "cy", "708");
    			attr_dev(circle7, "r", "49.5");
    			attr_dev(circle7, "fill", "#2C82C9");
    			attr_dev(circle7, "stroke", "black");
    			add_location(circle7, file$2, 542, 4, 13348);
    			attr_dev(path5, "id", "Vector 14");
    			attr_dev(path5, "d", "M204 743.075V732.356C204 732.356 194.649 730.139 189.911 724.504C185.435 719.181 182.996 706.708 182.996 706.708C182.996 706.708 183.795 705 186.558 705C189.911 705 190.899 706.708 190.899 706.708C190.899 706.708 192.009 714.675 195.453 718.898C199.711 724.117 203.273 725.352 210.008 725.349C216.738 725.346 220.307 724.124 224.546 718.898C228.013 714.623 229.037 706.771 229.037 706.771C229.037 706.771 230.057 705 233.568 705C236.354 705 236.972 706.771 236.972 706.771C236.972 706.771 234.504 719.172 230.057 724.472C225.33 730.105 216 732.356 216 732.356V743.075C216 743.075 215.537 744.894 210 744.894C204.463 744.894 204 743.075 204 743.075Z");
    			attr_dev(path5, "fill", "white");
    			attr_dev(path5, "stroke", "black");
    			add_location(path5, file$2, 550, 4, 13471);
    			attr_dev(path6, "id", "Vector 15");
    			attr_dev(path6, "d", "M195.107 685.475V708.416C195.107 708.416 195.04 721.9 209.985 721.9C224.93 721.9 224.934 708.416 224.934 708.416V685.475C224.934 685.475 224.934 672 209.985 672C195.036 672 195.107 685.475 195.107 685.475Z");
    			attr_dev(path6, "fill", "white");
    			attr_dev(path6, "stroke", "black");
    			add_location(path6, file$2, 556, 4, 14204);
    			attr_dev(g7, "id", "record");
    			attr_dev(g7, "opacity", "0.75");
    			add_location(g7, file$2, 541, 3, 13293);
    			attr_dev(circle8, "cx", "210");
    			attr_dev(circle8, "cy", "708");
    			attr_dev(circle8, "fill", "transparent");
    			attr_dev(circle8, "stroke", "#2C82C9");
    			add_location(circle8, file$2, 564, 4, 14539);
    			attr_dev(g8, "id", "recording");
    			attr_dev(g8, "opacity", "0.75");
    			add_location(g8, file$2, 563, 3, 14501);
    			attr_dev(circle9, "id", "Ellipse 3_4");
    			attr_dev(circle9, "cx", "80");
    			attr_dev(circle9, "cy", "596");
    			attr_dev(circle9, "r", "49.5");
    			attr_dev(circle9, "fill", "#FCB941");
    			attr_dev(circle9, "stroke", "black");
    			add_location(circle9, file$2, 567, 4, 14666);
    			attr_dev(rect2, "id", "Rectangle 1_2");
    			attr_dev(rect2, "x", "61.5");
    			attr_dev(rect2, "y", "577.5");
    			attr_dev(rect2, "width", "37");
    			attr_dev(rect2, "height", "37");
    			attr_dev(rect2, "fill", "white");
    			attr_dev(rect2, "stroke", "black");
    			add_location(rect2, file$2, 575, 4, 14788);
    			attr_dev(g9, "id", "stop");
    			attr_dev(g9, "opacity", "0.75");
    			add_location(g9, file$2, 566, 3, 14615);
    			attr_dev(circle10, "id", "Ellipse 3_5");
    			attr_dev(circle10, "cx", "80");
    			attr_dev(circle10, "cy", "596");
    			attr_dev(circle10, "r", "49.5");
    			attr_dev(circle10, "fill", "#FCB941");
    			attr_dev(circle10, "stroke", "black");
    			add_location(circle10, file$2, 586, 4, 14990);
    			attr_dev(path7, "id", "Vector 21");
    			attr_dev(path7, "d", "M116.473 596.106C116.473 587.41 108.876 588.142 108.876 588.142H81.5053V573.129L41.6855 596.106L81.5053 619.357V604.802H108.876C108.876 604.802 116.473 604.802 116.473 596.106Z");
    			attr_dev(path7, "fill", "white");
    			attr_dev(path7, "stroke", "black");
    			add_location(path7, file$2, 594, 4, 15112);
    			attr_dev(g10, "id", "back");
    			attr_dev(g10, "opacity", "0.75");
    			add_location(g10, file$2, 585, 3, 14936);
    			attr_dev(circle11, "id", "Ellipse 4");
    			attr_dev(circle11, "cx", "210");
    			attr_dev(circle11, "cy", "708");
    			attr_dev(circle11, "r", "49.5");
    			attr_dev(circle11, "fill", "#FC6042");
    			attr_dev(circle11, "stroke", "black");
    			add_location(circle11, file$2, 607, 4, 15496);
    			attr_dev(path8, "id", "Vector 2");
    			attr_dev(path8, "d", "M194.5 685C193.884 685.047 193 685.5 193 685.5L187.5 691C187.5 691 187 691.883 187 692.5C187 693.117 187.5 694 187.5 694L201 708L187.5 721.5C187.5 721.5 186.571 722.3 186.5 723C186.438 723.614 187 724.5 187 724.5L193 730.5C193 730.5 193.801 731.413 194.5 731.5C195.366 731.608 196.5 730.5 196.5 730.5L210 717.5L223.5 730.5C223.5 730.5 224.697 731.062 225.5 731C226.116 730.953 227 730.5 227 730.5L233 724.5C233 724.5 233.587 723.611 233.5 723C233.438 722.568 233 722 233 722L219 708L233 694C233 694 233.587 693.111 233.5 692.5C233.438 692.068 233 691.5 233 691.5L227 685.5C227 685.5 226.117 685 225.5 685C224.883 685 224 685.5 224 685.5L210 699L196.5 685.5C196.5 685.5 195.303 684.938 194.5 685Z");
    			attr_dev(path8, "fill", "white");
    			attr_dev(path8, "stroke", "black");
    			add_location(path8, file$2, 615, 4, 15617);
    			attr_dev(g11, "id", "cancel");
    			attr_dev(g11, "opacity", "0.75");
    			attr_dev(g11, "style", g11_style_value = `${!/*task*/ ctx[53] ? "display:none" : ""}`);
    			add_location(g11, file$2, 601, 3, 15380);
    			attr_dev(circle12, "id", "Ellipse 4_2");
    			attr_dev(circle12, "cx", "210");
    			attr_dev(circle12, "cy", "708");
    			attr_dev(circle12, "r", "47");
    			attr_dev(circle12, "stroke", "#FC6042");
    			attr_dev(circle12, "stroke-width", "6");
    			add_location(circle12, file$2, 623, 4, 16440);
    			attr_dev(path9, "id", "Vector 2_2");
    			attr_dev(path9, "d", "M194.5 685C193.884 685.047 193 685.5 193 685.5L187.5 691C187.5 691 187 691.883 187 692.5C187 693.117 187.5 694 187.5 694L201 708L187.5 721.5C187.5 721.5 186.571 722.3 186.5 723C186.438 723.614 187 724.5 187 724.5L193 730.5C193 730.5 193.801 731.413 194.5 731.5C195.366 731.608 196.5 730.5 196.5 730.5L210 717.5L223.5 730.5C223.5 730.5 224.697 731.062 225.5 731C226.116 730.953 227 730.5 227 730.5L233 724.5C233 724.5 233.587 723.611 233.5 723C233.438 722.568 233 722 233 722L219 708L233 694C233 694 233.587 693.111 233.5 692.5C233.438 692.068 233 691.5 233 691.5L227 685.5C227 685.5 226.117 685 225.5 685C224.883 685 224 685.5 224 685.5L210 699L196.5 685.5C196.5 685.5 195.303 684.938 194.5 685Z");
    			attr_dev(path9, "fill", "white");
    			attr_dev(path9, "stroke", "#FC6042");
    			attr_dev(path9, "stroke-width", "6");
    			add_location(path9, file$2, 631, 4, 16565);
    			attr_dev(g12, "id", "canceled");
    			attr_dev(g12, "opacity", "0.75");
    			add_location(g12, file$2, 622, 3, 16403);
    			attr_dev(circle13, "id", "Ellipse 1");
    			attr_dev(circle13, "cx", "350");
    			attr_dev(circle13, "cy", "108");
    			attr_dev(circle13, "r", "49.5");
    			attr_dev(circle13, "fill", "#2C82C9");
    			attr_dev(circle13, "stroke", "black");
    			add_location(circle13, file$2, 640, 4, 17426);
    			attr_dev(path10, "id", "Vector 2_3");
    			attr_dev(path10, "d", "M322.599 102.772C322.197 103.241 321.892 104.186 321.892 104.186L321.892 111.964C321.892 111.964 322.163 112.942 322.599 113.378C323.036 113.815 324.013 114.085 324.013 114.085L343.459 114.439L343.459 133.531C343.459 133.531 343.367 134.753 343.812 135.299C344.203 135.777 345.227 136.006 345.227 136.006L353.712 136.006C353.712 136.006 354.924 136.084 355.48 135.652C356.169 135.116 356.187 133.531 356.187 133.531L356.54 114.793L375.279 114.439C375.279 114.439 376.523 113.99 377.046 113.378C377.448 112.91 377.754 111.964 377.754 111.964V103.479C377.754 103.479 377.54 102.435 377.046 102.065C376.697 101.803 375.986 101.711 375.986 101.711H356.187V81.9121C356.187 81.9121 355.974 80.8684 355.48 80.4979C355.13 80.2359 354.419 80.1443 354.419 80.1443L345.934 80.1443C345.934 80.1443 344.956 80.4148 344.52 80.8514C344.083 81.288 343.812 82.2656 343.812 82.2656L343.459 101.711L324.367 101.711C324.367 101.711 323.123 102.16 322.599 102.772Z");
    			attr_dev(path10, "fill", "white");
    			attr_dev(path10, "stroke", "black");
    			add_location(path10, file$2, 648, 4, 17547);
    			attr_dev(g13, "id", "add");
    			attr_dev(g13, "opacity", "0.75");
    			add_location(g13, file$2, 639, 3, 17377);
    			attr_dev(circle14, "id", "Ellipse 1_2");
    			attr_dev(circle14, "cx", "350");
    			attr_dev(circle14, "cy", "108");
    			attr_dev(circle14, "r", "49.5");
    			attr_dev(circle14, "fill", "#2C82C9");
    			attr_dev(circle14, "stroke", "black");
    			add_location(circle14, file$2, 656, 4, 18638);
    			attr_dev(path11, "id", "Vector 17");
    			attr_dev(path11, "d", "M318.414 107.781C318.387 106.071 318.414 103.43 318.414 103.43H330.523V107.749C330.523 120.124 340.85 127.567 349.809 127.567C360.607 127.567 366.214 118.979 366.214 118.979L363.394 116.649C363.394 116.649 363.207 116.403 363.301 116.23C363.394 116.057 363.73 116.119 363.73 116.119H378.154V130.308C378.154 130.308 378.021 130.805 377.778 130.819C377.534 130.833 377.109 130.308 377.109 130.308L374.684 127.567C374.684 127.567 366.224 139.498 349.809 139.498C333.046 139.498 318.692 125.897 318.414 107.781Z");
    			attr_dev(path11, "fill", "white");
    			attr_dev(path11, "stroke", "black");
    			add_location(path11, file$2, 664, 4, 18761);
    			attr_dev(path12, "id", "Vector 19");
    			attr_dev(path12, "d", "M381.711 108.147C381.738 109.857 381.711 112.498 381.711 112.498H369.602V108.179C369.602 95.8036 359.275 88.3613 350.316 88.3613C339.518 88.3613 333.911 96.9485 333.911 96.9485L336.731 99.2789C336.731 99.2789 336.917 99.5249 336.824 99.6981C336.731 99.8714 336.394 99.8089 336.394 99.8089H321.971V85.6196C321.971 85.6196 322.104 85.1227 322.347 85.1088C322.591 85.095 323.016 85.6196 323.016 85.6196L325.441 88.3613C325.441 88.3613 333.901 76.4298 350.316 76.4298C367.079 76.4298 381.433 90.0311 381.711 108.147Z");
    			attr_dev(path12, "fill", "white");
    			attr_dev(path12, "stroke", "black");
    			add_location(path12, file$2, 670, 4, 19353);
    			attr_dev(g14, "id", "reopen");
    			attr_dev(g14, "opacity", "0.75");
    			add_location(g14, file$2, 655, 3, 18583);
    			attr_dev(circle15, "id", "Ellipse 1_3");
    			attr_dev(circle15, "cx", "82");
    			attr_dev(circle15, "cy", "108");
    			attr_dev(circle15, "r", "49.5");
    			attr_dev(circle15, "fill", "#2C82C9");
    			attr_dev(circle15, "stroke", "black");
    			add_location(circle15, file$2, 678, 4, 20010);
    			attr_dev(path13, "fill-rule", "evenodd");
    			attr_dev(path13, "clip-rule", "evenodd");
    			attr_dev(path13, "d", "M89.9573 110.352C95.7814 107.39 99.7715 101.341 99.7715 94.3596C99.7715 84.4572 91.744 76.4298 81.8416 76.4298C71.9393 76.4298 63.9118 84.4572 63.9118 94.3596C63.9118 101.391 67.9597 107.478 73.8524 110.415C70.1911 111.656 66.8258 113.727 64.0408 116.512C59.2777 121.275 56.6019 127.735 56.6019 134.471L82 134.471H107.398C107.398 127.735 104.722 121.275 99.9592 116.512C97.126 113.679 93.6923 111.584 89.9573 110.352Z");
    			add_location(path13, file$2, 688, 6, 20204);
    			attr_dev(mask, "id", "path-31-inside-2_1_5");
    			attr_dev(mask, "fill", "white");
    			add_location(mask, file$2, 687, 5, 20152);
    			attr_dev(path14, "fill-rule", "evenodd");
    			attr_dev(path14, "clip-rule", "evenodd");
    			attr_dev(path14, "d", "M89.9573 110.352C95.7814 107.39 99.7715 101.341 99.7715 94.3596C99.7715 84.4572 91.744 76.4298 81.8416 76.4298C71.9393 76.4298 63.9118 84.4572 63.9118 94.3596C63.9118 101.391 67.9597 107.478 73.8524 110.415C70.1911 111.656 66.8258 113.727 64.0408 116.512C59.2777 121.275 56.6019 127.735 56.6019 134.471L82 134.471H107.398C107.398 127.735 104.722 121.275 99.9592 116.512C97.126 113.679 93.6923 111.584 89.9573 110.352Z");
    			attr_dev(path14, "fill", "white");
    			add_location(path14, file$2, 694, 5, 20720);
    			attr_dev(path15, "d", "M89.9573 110.352L89.504 109.46L87.3633 110.549L89.644 111.301L89.9573 110.352ZM73.8524 110.415L74.1732 111.363L76.4479 110.592L74.2986 109.521L73.8524 110.415ZM64.0408 116.512L63.3337 115.805L63.3337 115.805L64.0408 116.512ZM56.6019 134.471H55.6019V135.471L56.6019 135.471L56.6019 134.471ZM82 134.471L82 135.471H82V134.471ZM107.398 134.471V135.471H108.398V134.471H107.398ZM99.9592 116.512L99.2521 117.219L99.2521 117.219L99.9592 116.512ZM98.7715 94.3596C98.7715 100.95 95.0058 106.663 89.504 109.46L90.4105 111.243C96.557 108.118 100.771 101.732 100.771 94.3596H98.7715ZM81.8416 77.4298C91.1917 77.4298 98.7715 85.0095 98.7715 94.3596H100.771C100.771 83.9049 92.2963 75.4298 81.8416 75.4298V77.4298ZM64.9118 94.3596C64.9118 85.0095 72.4916 77.4298 81.8416 77.4298V75.4298C71.387 75.4298 62.9118 83.9049 62.9118 94.3596H64.9118ZM74.2986 109.521C68.7321 106.745 64.9118 100.998 64.9118 94.3596H62.9118C62.9118 101.785 67.1873 108.21 73.4062 111.31L74.2986 109.521ZM73.5316 109.468C69.7262 110.757 66.2284 112.91 63.3337 115.805L64.7479 117.219C67.4233 114.544 70.656 112.554 74.1732 111.363L73.5316 109.468ZM63.3337 115.805C58.3831 120.756 55.6019 127.47 55.6019 134.471H57.6019C57.6019 128 60.1724 121.795 64.7479 117.219L63.3337 115.805ZM56.6019 135.471L82 135.471L82 133.471L56.6019 133.471L56.6019 135.471ZM82 135.471H107.398V133.471H82V135.471ZM108.398 134.471C108.398 127.47 105.617 120.756 100.666 115.805L99.2521 117.219C103.828 121.795 106.398 128 106.398 134.471H108.398ZM100.666 115.805C97.7215 112.86 94.1526 110.683 90.2706 109.402L89.644 111.301C93.232 112.485 96.5304 114.498 99.2521 117.219L100.666 115.805Z");
    			attr_dev(path15, "fill", "black");
    			attr_dev(path15, "mask", "url(#path-31-inside-2_1_5)");
    			add_location(path15, file$2, 700, 5, 21238);
    			attr_dev(g15, "id", "Union");
    			add_location(g15, file$2, 686, 4, 20132);
    			attr_dev(circle16, "id", "Ellipse 28");
    			attr_dev(circle16, "cx", "102.334");
    			attr_dev(circle16, "cy", "126.739");
    			attr_dev(circle16, "r", "11.5");
    			attr_dev(circle16, "fill", "white");
    			attr_dev(circle16, "stroke", "black");
    			add_location(circle16, file$2, 706, 4, 22956);
    			attr_dev(g16, "id", "login");
    			attr_dev(g16, "opacity", "0.75");
    			add_location(g16, file$2, 677, 3, 19957);
    			attr_dev(g17, "id", `g${/*index*/ ctx[55]}`);
    			attr_dev(g17, "class", g17_class_value = /*task*/ ctx[53]?.status || INACTIVE_STATUS);
    			add_location(g17, file$2, 367, 2, 8324);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, g17, anchor);
    			append_dev(g17, text0);
    			append_dev(text0, t0_1);
    			append_dev(g17, text1);
    			append_dev(text1, t1);
    			append_dev(g17, foreignObject);
    			append_dev(foreignObject, p);
    			append_dev(p, t2);
    			append_dev(g17, g0);
    			append_dev(g0, circle0);
    			append_dev(g0, path0);
    			append_dev(g17, g1);
    			append_dev(g1, circle1);
    			append_dev(g1, path1);
    			append_dev(g17, g2);
    			append_dev(g2, circle2);
    			append_dev(g2, path2);
    			append_dev(g17, g3);
    			append_dev(g3, circle3);
    			append_dev(g3, text2);
    			append_dev(text2, t3);
    			append_dev(g17, g4);
    			append_dev(g4, circle4);
    			append_dev(g4, path3);
    			append_dev(g17, g5);
    			append_dev(g5, circle5);
    			append_dev(g5, path4);
    			append_dev(g17, g6);
    			append_dev(g6, circle6);
    			append_dev(g6, rect0);
    			append_dev(g6, rect1);
    			append_dev(g17, g7);
    			append_dev(g7, circle7);
    			append_dev(g7, path5);
    			append_dev(g7, path6);
    			append_dev(g17, g8);
    			append_dev(g8, circle8);
    			append_dev(g17, g9);
    			append_dev(g9, circle9);
    			append_dev(g9, rect2);
    			append_dev(g17, g10);
    			append_dev(g10, circle10);
    			append_dev(g10, path7);
    			append_dev(g17, g11);
    			append_dev(g11, circle11);
    			append_dev(g11, path8);
    			append_dev(g17, g12);
    			append_dev(g12, circle12);
    			append_dev(g12, path9);
    			append_dev(g17, g13);
    			append_dev(g13, circle13);
    			append_dev(g13, path10);
    			append_dev(g17, g14);
    			append_dev(g14, circle14);
    			append_dev(g14, path11);
    			append_dev(g14, path12);
    			append_dev(g17, g16);
    			append_dev(g16, circle15);
    			append_dev(g16, g15);
    			append_dev(g15, mask);
    			append_dev(mask, path13);
    			append_dev(g15, path14);
    			append_dev(g15, path15);
    			append_dev(g16, circle16);
    			if_block.m(g16, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(g0, "click", /*oncheck*/ ctx[15], false, false, false),
    					listen_dev(g1, "click", /*oncheckadd*/ ctx[16], false, false, false),
    					listen_dev(g4, "click", /*onplay*/ ctx[11], false, false, false),
    					listen_dev(g5, "click", /*onaddplay*/ ctx[17], false, false, false),
    					listen_dev(g6, "click", /*onpause*/ ctx[12], false, false, false),
    					listen_dev(g7, "click", /*onrecord*/ ctx[13], false, false, false),
    					listen_dev(g9, "click", /*onstop*/ ctx[14], false, false, false),
    					listen_dev(g10, "click", /*onbackadd*/ ctx[18], false, false, false),
    					listen_dev(g11, "click", /*oncancel*/ ctx[19], false, false, false),
    					listen_dev(g13, "click", /*onadd*/ ctx[20], false, false, false),
    					listen_dev(g14, "click", onreopen, false, false, false),
    					listen_dev(g16, "click", /*onlogin*/ ctx[10], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*focusTasks*/ 4 && t0_1_value !== (t0_1_value = (/*task*/ ctx[53]
    			? new Date(/*task*/ ctx[53].time).toISOString().substring(11, 11 + 8)
    			: "") + "")) set_data_dev(t0_1, t0_1_value);

    			if (dirty[0] & /*focusTasks*/ 4 && t1_value !== (t1_value = translation(/*task*/ ctx[53]?.status || "") + "")) set_data_dev(t1, t1_value);
    			if (dirty[0] & /*focusTasks*/ 4 && t2_value !== (t2_value = (/*task*/ ctx[53]?.title || translation("Sin tareas pendientes")) + "")) set_data_dev(t2, t2_value);

    			if (dirty[0] & /*focusTasks*/ 4 && g0_style_value !== (g0_style_value = `${!/*task*/ ctx[53] ? "display:none" : ""}`)) {
    				attr_dev(g0, "style", g0_style_value);
    			}

    			if (dirty[0] & /*enlapsedTime*/ 16 && circle3_stroke_dasharray_value !== (circle3_stroke_dasharray_value = `calc(${/*enlapsedTime*/ ctx[4] / /*maxTime*/ ctx[9]} * ${2 * Math.PI * 56}) ${2 * Math.PI * 56}`)) {
    				attr_dev(circle3, "stroke-dasharray", circle3_stroke_dasharray_value);
    			}

    			if (dirty[0] & /*focusTasks, enlapsedTime*/ 20 && t3_value !== (t3_value = (/*task*/ ctx[53]
    			? new Date(/*enlapsedTime*/ ctx[4]).toISOString().substr(14, 5)
    			: "") + "")) set_data_dev(t3, t3_value);

    			if (dirty[0] & /*focusTasks*/ 4 && g4_style_value !== (g4_style_value = `${!/*task*/ ctx[53] ? "display:none" : ""}`)) {
    				attr_dev(g4, "style", g4_style_value);
    			}

    			if (dirty[0] & /*focusTasks*/ 4 && g11_style_value !== (g11_style_value = `${!/*task*/ ctx[53] ? "display:none" : ""}`)) {
    				attr_dev(g11, "style", g11_style_value);
    			}

    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(g16, null);
    				}
    			}

    			if (dirty[0] & /*focusTasks*/ 4 && g17_class_value !== (g17_class_value = /*task*/ ctx[53]?.status || INACTIVE_STATUS)) {
    				attr_dev(g17, "class", g17_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(g17);
    			if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(367:1) {#each focusTasks as task, index}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let g2;
    	let foreignObject;
    	let textarea_1;
    	let g1;
    	let aspectos;
    	let updating_checked;
    	let g0;
    	let circle;
    	let path;
    	let g2_class_value;
    	let g2_style_value;
    	let current;
    	let mounted;
    	let dispose;
    	let each_value = /*focusTasks*/ ctx[2];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	function aspectos_checked_binding(value) {
    		/*aspectos_checked_binding*/ ctx[29](value);
    	}

    	let aspectos_props = {};

    	if (/*selectedAspects*/ ctx[7] !== void 0) {
    		aspectos_props.checked = /*selectedAspects*/ ctx[7];
    	}

    	aspectos = new Aspectos({ props: aspectos_props, $$inline: true });
    	binding_callbacks.push(() => bind(aspectos, 'checked', aspectos_checked_binding));

    	const block = {
    		c: function create() {
    			g2 = svg_element("g");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			foreignObject = svg_element("foreignObject");
    			textarea_1 = element("textarea");
    			g1 = svg_element("g");
    			create_component(aspectos.$$.fragment);
    			g0 = svg_element("g");
    			circle = svg_element("circle");
    			path = svg_element("path");
    			add_location(textarea_1, file$2, 731, 2, 25115);
    			attr_dev(foreignObject, "id", "add-task-form");
    			attr_dev(foreignObject, "x", "41");
    			attr_dev(foreignObject, "y", "200");
    			attr_dev(foreignObject, "width", "350");
    			attr_dev(foreignObject, "height", "300");
    			add_location(foreignObject, file$2, 730, 1, 25038);
    			attr_dev(circle, "id", "Ellipse 2");
    			attr_dev(circle, "cx", "346");
    			attr_dev(circle, "cy", "596");
    			attr_dev(circle, "r", "49.5");
    			attr_dev(circle, "fill", "#2CC990");
    			attr_dev(circle, "stroke", "black");
    			add_location(circle, file$2, 736, 3, 25305);
    			attr_dev(path, "id", "Vector 1");
    			attr_dev(path, "d", "M364.736 572.467L337.325 600.189L326.697 589.157C326.697 589.157 321.103 584.348 315.788 589.157C310.474 593.966 314.39 600.189 314.39 600.189L331.731 617.728C331.731 617.728 335.334 620.17 337.885 619.991C340.031 619.84 342.92 617.728 342.92 617.728L376.484 583.782C376.484 583.782 380.4 578.691 375.645 573.599C370.89 568.507 364.736 572.467 364.736 572.467Z");
    			attr_dev(path, "fill", "white");
    			attr_dev(path, "stroke", "black");
    			add_location(path, file$2, 744, 3, 25418);
    			attr_dev(g0, "opacity", "0.75");
    			add_location(g0, file$2, 735, 2, 25234);
    			attr_dev(g1, "id", "aspectos");
    			add_location(g1, file$2, 733, 1, 25168);
    			attr_dev(g2, "class", g2_class_value = `${/*taskEffect*/ ctx[5]} ${/*addTaskEffect*/ ctx[6]}`);

    			attr_dev(g2, "style", g2_style_value = `
	--speed: ${/*speed*/ ctx[0] * 0.001}s;
	--speed05: ${/*speed*/ ctx[0] * 0.0005}s;
	--speed025: ${/*speed*/ ctx[0] * 0.00025}s;
	--speed075: ${/*speed*/ ctx[0] * 0.00075}s;
	--pause_show: ${/*WITHOUT_PAUSE*/ ctx[8] ? "none" : "block"};
	--pause_hide: ${/*WITHOUT_PAUSE*/ ctx[8] ? "block" : "none"};
`);

    			add_location(g2, file$2, 355, 0, 7994);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, g2, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(g2, null);
    			}

    			append_dev(g2, foreignObject);
    			append_dev(foreignObject, textarea_1);
    			/*textarea_1_binding*/ ctx[28](textarea_1);
    			append_dev(g2, g1);
    			mount_component(aspectos, g1, null);
    			append_dev(g1, g0);
    			append_dev(g0, circle);
    			append_dev(g0, path);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(window, "touchstart", /*flickStart*/ ctx[22], false, false, false),
    					listen_dev(window, "touchmove", /*flickDetect*/ ctx[23], false, false, false),
    					listen_dev(window, "touchend", /*flickEnd*/ ctx[24], false, false, false),
    					listen_dev(g0, "click", /*click_handler*/ ctx[30], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*focusTasks, onlogin, user, onadd, oncancel, onbackadd, onstop, onrecord, onpause, onaddplay, onplay, enlapsedTime, maxTime, oncheckadd, oncheck*/ 2096662) {
    				each_value = /*focusTasks*/ ctx[2];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(g2, foreignObject);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			const aspectos_changes = {};

    			if (!updating_checked && dirty[0] & /*selectedAspects*/ 128) {
    				updating_checked = true;
    				aspectos_changes.checked = /*selectedAspects*/ ctx[7];
    				add_flush_callback(() => updating_checked = false);
    			}

    			aspectos.$set(aspectos_changes);

    			if (!current || dirty[0] & /*taskEffect, addTaskEffect*/ 96 && g2_class_value !== (g2_class_value = `${/*taskEffect*/ ctx[5]} ${/*addTaskEffect*/ ctx[6]}`)) {
    				attr_dev(g2, "class", g2_class_value);
    			}

    			if (!current || dirty[0] & /*speed*/ 1 && g2_style_value !== (g2_style_value = `
	--speed: ${/*speed*/ ctx[0] * 0.001}s;
	--speed05: ${/*speed*/ ctx[0] * 0.0005}s;
	--speed025: ${/*speed*/ ctx[0] * 0.00025}s;
	--speed075: ${/*speed*/ ctx[0] * 0.00075}s;
	--pause_show: ${/*WITHOUT_PAUSE*/ ctx[8] ? "none" : "block"};
	--pause_hide: ${/*WITHOUT_PAUSE*/ ctx[8] ? "block" : "none"};
`)) {
    				attr_dev(g2, "style", g2_style_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(aspectos.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(aspectos.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(g2);
    			destroy_each(each_blocks, detaching);
    			/*textarea_1_binding*/ ctx[28](null);
    			destroy_component(aspectos);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function onreopen() {
    	
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Home', slots, []);
    	let WITHOUT_PAUSE = true;
    	let speed = 1000;
    	let tasks = [];
    	let user = {};

    	tasksStore.subscribe(value => {
    		tasks = value;
    	});

    	userStore.subscribe(value => {
    		$$invalidate(1, user = value);
    	});

    	let focusTasks = [];
    	let currentTask = getNextPendingTaskAfter(-1);
    	let nextTask = null;
    	let previousTask = null;
    	let taskBeforeCreate = null;
    	let taskStatus = ""; //currentTask?.status || INACTIVE_STATUS;
    	let flickStartX;
    	let flickStartY;
    	let t0 = 0;
    	let delta = 0;
    	let swipe = "";
    	let textarea;
    	let enlapsedTime = 0; // in milliseconds
    	let maxTime = 1800000; // 30 minutes in milliseconds
    	let last_lap_bell = new Audio("sounds/last_lap_bell.mp3");
    	let play_last_lap_bell = true;
    	let taskEffect = "";
    	let addTaskEffect = "";
    	let listeners = {};
    	let selectedAspects = [];

    	LocalNotifications.addListener("localNotificationReceived", () => {
    		pleaseTakeARest();
    	});

    	function onlogin() {
    		// route to login
    		push("/login");
    	}

    	async function onplay() {
    		$$invalidate(25, currentTask = startTask(currentTask));
    		$$invalidate(4, enlapsedTime = 0);
    		play_last_lap_bell = true;

    		const notifications = [
    			{
    				id: new Date().getTime(),
    				title: translation("Enfocate"),
    				body: translation("Toma un descanso"),
    				schedule: {
    					at: new Date(new Date().getTime() + maxTime),
    					allowWhileIdle: true
    				}
    			}
    		];

    		await LocalNotifications.schedule({ notifications });
    	}

    	function onpause() {
    		$$invalidate(25, currentTask = pauseTask(currentTask));
    	} // taskStatus = currentTask.status;

    	function onrecord() {
    		// toggle recording
    		recognition$1.toggle();

    		textarea.focus();
    	}

    	function onstop() {
    		$$invalidate(25, currentTask = stopTask(currentTask));
    	}

    	function oncheck() {
    		completeCurrentTask();
    	}

    	async function oncheckadd() {
    		if (textarea.value.trim() === "") {
    			return;
    		}

    		await addTask();
    		setAspects(currentTask, selectedAspects);
    		$$invalidate(5, taskEffect = "");
    	}

    	async function onaddplay() {
    		if (textarea.value.trim() === "") {
    			return;
    		}

    		await addTask();
    		setAspects(currentTask, selectedAspects);
    		onplay();
    		$$invalidate(5, taskEffect = "");
    	}

    	function onbackadd() {
    		$$invalidate(5, taskEffect = "");
    		recognition$1.stop();
    		$$invalidate(3, textarea.value = "", textarea);
    		$$invalidate(25, currentTask = taskBeforeCreate);
    	}

    	function oncancel() {
    		cancelCurrentTask();
    	}

    	function unpause() {
    		taskStatus = INACTIVE_STATUS;
    	}

    	async function onadd() {
    		$$invalidate(5, taskEffect = "creating-task");
    		taskBeforeCreate = currentTask;
    		$$invalidate(25, currentTask = null);
    		await tick();

    		setTimeout(
    			async () => {
    				$$invalidate(5, taskEffect = "creating");
    				await tick();
    				textarea.focus();

    				recognition$1.start({
    					onchange(value) {
    						$$invalidate(3, textarea.value = (textarea.value ? textarea.value + " " : "") + value, textarea);
    					},
    					completed() {
    						
    					}
    				});
    			},
    			speed * 0.5
    		);
    	}

    	async function addTask() {
    		$$invalidate(25, currentTask = addNewTask({ title: textarea.value }));
    		$$invalidate(3, textarea.value = "", textarea);
    		recognition$1.stop();
    		$$invalidate(5, taskEffect = "choose-aspect");
    		$$invalidate(7, selectedAspects = []);
    		return waitForAction("selected-aspects");
    	}

    	function waitForAction(eventName) {
    		return new Promise(resolve => {
    				listeners[eventName] = resolve;
    			});
    	}

    	function throwAction(actionName) {
    		console.log(actionName, listeners[actionName]);

    		if (listeners[actionName]) {
    			listeners[actionName](actionName);
    		}
    	}

    	function getNextPendingTaskAfter(currentIndex) {
    		return tasks.find((task, index) => task.status !== COMPLETED_STATUS && task.status !== CANCELED_STATUS && index > currentIndex) || null;
    	}

    	function getPreviousPendingTaskBefore(currentIndex) {
    		if (currentIndex === -1) {
    			currentIndex = tasks.length;
    		}

    		for (let i = currentIndex - 1; i >= 0; i--) {
    			const task = tasks[i];

    			if (task.status !== COMPLETED_STATUS && task.status !== CANCELED_STATUS) {
    				return task;
    			}
    		}

    		return null;
    	}

    	async function completeCurrentTask() {
    		const currentIndex = tasks.indexOf(currentTask);
    		$$invalidate(25, currentTask = completeTask(currentTask));
    		let task = getNextPendingTaskAfter(currentIndex);

    		if (!task) {
    			task = getNextPendingTaskAfter(-1);
    		}

    		$$invalidate(26, nextTask = task);
    		$$invalidate(5, taskEffect = "complete-task");
    		await tick();

    		setTimeout(
    			() => {
    				$$invalidate(25, currentTask = nextTask);
    				$$invalidate(5, taskEffect = "");
    			},
    			speed
    		);
    	}

    	async function cancelCurrentTask() {
    		const currentIndex = tasks.indexOf(currentTask);
    		$$invalidate(25, currentTask = cancelTask(currentTask));
    		let task = getNextPendingTaskAfter(currentIndex);

    		if (!task) {
    			task = getNextPendingTaskAfter(-1);
    		}

    		$$invalidate(26, nextTask = task);
    		taskStatus = "inactive complete-task";
    		await tick();

    		setTimeout(
    			() => {
    				$$invalidate(25, currentTask = nextTask);
    				taskStatus = INACTIVE_STATUS;
    			},
    			speed
    		);
    	}

    	async function goNextTask() {
    		const currentIndex = tasks.indexOf(currentTask);
    		const task = getNextPendingTaskAfter(currentIndex);

    		if (!task) {
    			return;
    		}

    		$$invalidate(26, nextTask = task);
    		$$invalidate(5, taskEffect = "next-task");
    		await tick();

    		setTimeout(
    			() => {
    				$$invalidate(27, previousTask = currentTask);
    				$$invalidate(25, currentTask = nextTask);
    				$$invalidate(5, taskEffect = "");
    				$$invalidate(0, speed = 1000);
    			},
    			speed
    		);
    	}

    	async function goPreviousTask() {
    		const currentIndex = tasks.indexOf(currentTask);
    		$$invalidate(26, nextTask = currentTask);
    		let pTask = getPreviousPendingTaskBefore(currentIndex);

    		if (!pTask) {
    			return;
    		}

    		$$invalidate(27, previousTask = pTask);
    		await tick();
    		$$invalidate(5, taskEffect = "previous-task");

    		setTimeout(
    			() => {
    				$$invalidate(26, nextTask = currentTask);
    				$$invalidate(25, currentTask = previousTask);
    				$$invalidate(5, taskEffect = "");
    				$$invalidate(0, speed = 1000);
    			},
    			speed
    		);
    	}

    	async function goCompletedList(direction) {
    		$$invalidate(5, taskEffect = `move-${direction}-task`);
    		await tick();

    		setTimeout(
    			() => {
    				$$invalidate(5, taskEffect = "");
    				push("/completed");
    			},
    			speed * 0.35
    		);
    	}

    	function flickStart(event) {
    		let touch = event.touches[0];
    		flickStartX = touch.pageX;
    		flickStartY = touch.pageY;
    		t0 = new Date().getTime();
    		swipe = "";
    	}

    	function flickDetect(event) {
    		if (!flickStartX && !flickStartY) {
    			return;
    		}

    		let touch = event.touches[0];
    		let x = touch.pageX;
    		let y = touch.pageY;
    		let deltaX = x - flickStartX;
    		let deltaY = y - flickStartY;
    		let absDeltaX = Math.abs(deltaX);
    		let absDeltaY = Math.abs(deltaY);

    		if (absDeltaX > 0 && absDeltaX > absDeltaY) {
    			delta = deltaX;

    			if (deltaX < 0) {
    				swipe = "left";
    			} else {
    				swipe = "right";
    			}
    		} else if (absDeltaY > 0 && absDeltaY > absDeltaX) {
    			delta = deltaY;

    			if (deltaY < 0) {
    				swipe = "up";
    			} else {
    				swipe = "down";
    			}
    		}
    	}

    	function flickEnd() {
    		if (taskEffect !== "") {
    			return;
    		}

    		$$invalidate(0, speed = Math.min(1000, Math.max(100, Math.abs(432 / (delta * 2 / (new Date().getTime() - t0))))));
    		flickStartX = 0;
    		flickStartY = 0;

    		switch (swipe) {
    			case "left":
    				goNextTask();
    				break;
    			case "right":
    				goPreviousTask();
    				break;
    			case "up":
    			case "down":
    				goCompletedList(swipe);
    				break;
    		}
    	}

    	function pleaseTakeARest() {
    		if (play_last_lap_bell) {
    			play_last_lap_bell = false;

    			try {
    				last_lap_bell.play();
    			} catch(e) {
    				console.error(e);
    			}
    		}
    	}

    	setInterval(
    		() => {
    			if (currentTask && currentTask.status === ACTIVE_STATUS) {
    				const time = new Date().getTime();
    				$$invalidate(4, enlapsedTime = Math.max(0, time - currentTask.continue_at));
    				$$invalidate(25, currentTask = updateTime(currentTask));

    				if (enlapsedTime >= maxTime) {
    					pleaseTakeARest();
    				}
    			}
    		},
    		1000
    	);

    	recognition$1.onstart(() => $$invalidate(6, addTaskEffect = "recording"));
    	recognition$1.onend(() => $$invalidate(6, addTaskEffect = ""));
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<Home> was created with unknown prop '${key}'`);
    	});

    	function textarea_1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			textarea = $$value;
    			$$invalidate(3, textarea);
    		});
    	}

    	function aspectos_checked_binding(value) {
    		selectedAspects = value;
    		$$invalidate(7, selectedAspects);
    	}

    	const click_handler = () => throwAction("selected-aspects");

    	$$self.$capture_state = () => ({
    		tick,
    		_: translation,
    		Aspectos,
    		recognition: recognition$1,
    		LocalNotifications,
    		INACTIVE_STATUS,
    		tasksStore,
    		userStore,
    		addNewTask,
    		completeTask,
    		startTask,
    		updateTime,
    		pauseTask,
    		COMPLETED_STATUS,
    		cancelTask,
    		CANCELED_STATUS,
    		stopTask,
    		ACTIVE_STATUS,
    		setAspects,
    		push,
    		WITHOUT_PAUSE,
    		speed,
    		tasks,
    		user,
    		focusTasks,
    		currentTask,
    		nextTask,
    		previousTask,
    		taskBeforeCreate,
    		taskStatus,
    		flickStartX,
    		flickStartY,
    		t0,
    		delta,
    		swipe,
    		textarea,
    		enlapsedTime,
    		maxTime,
    		last_lap_bell,
    		play_last_lap_bell,
    		taskEffect,
    		addTaskEffect,
    		listeners,
    		selectedAspects,
    		onlogin,
    		onplay,
    		onpause,
    		onrecord,
    		onreopen,
    		onstop,
    		oncheck,
    		oncheckadd,
    		onaddplay,
    		onbackadd,
    		oncancel,
    		unpause,
    		onadd,
    		addTask,
    		waitForAction,
    		throwAction,
    		getNextPendingTaskAfter,
    		getPreviousPendingTaskBefore,
    		completeCurrentTask,
    		cancelCurrentTask,
    		goNextTask,
    		goPreviousTask,
    		goCompletedList,
    		flickStart,
    		flickDetect,
    		flickEnd,
    		pleaseTakeARest
    	});

    	$$self.$inject_state = $$props => {
    		if ('WITHOUT_PAUSE' in $$props) $$invalidate(8, WITHOUT_PAUSE = $$props.WITHOUT_PAUSE);
    		if ('speed' in $$props) $$invalidate(0, speed = $$props.speed);
    		if ('tasks' in $$props) tasks = $$props.tasks;
    		if ('user' in $$props) $$invalidate(1, user = $$props.user);
    		if ('focusTasks' in $$props) $$invalidate(2, focusTasks = $$props.focusTasks);
    		if ('currentTask' in $$props) $$invalidate(25, currentTask = $$props.currentTask);
    		if ('nextTask' in $$props) $$invalidate(26, nextTask = $$props.nextTask);
    		if ('previousTask' in $$props) $$invalidate(27, previousTask = $$props.previousTask);
    		if ('taskBeforeCreate' in $$props) taskBeforeCreate = $$props.taskBeforeCreate;
    		if ('taskStatus' in $$props) taskStatus = $$props.taskStatus;
    		if ('flickStartX' in $$props) flickStartX = $$props.flickStartX;
    		if ('flickStartY' in $$props) flickStartY = $$props.flickStartY;
    		if ('t0' in $$props) t0 = $$props.t0;
    		if ('delta' in $$props) delta = $$props.delta;
    		if ('swipe' in $$props) swipe = $$props.swipe;
    		if ('textarea' in $$props) $$invalidate(3, textarea = $$props.textarea);
    		if ('enlapsedTime' in $$props) $$invalidate(4, enlapsedTime = $$props.enlapsedTime);
    		if ('maxTime' in $$props) $$invalidate(9, maxTime = $$props.maxTime);
    		if ('last_lap_bell' in $$props) last_lap_bell = $$props.last_lap_bell;
    		if ('play_last_lap_bell' in $$props) play_last_lap_bell = $$props.play_last_lap_bell;
    		if ('taskEffect' in $$props) $$invalidate(5, taskEffect = $$props.taskEffect);
    		if ('addTaskEffect' in $$props) $$invalidate(6, addTaskEffect = $$props.addTaskEffect);
    		if ('listeners' in $$props) listeners = $$props.listeners;
    		if ('selectedAspects' in $$props) $$invalidate(7, selectedAspects = $$props.selectedAspects);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*previousTask, currentTask, nextTask*/ 234881024) {
    			{
    				$$invalidate(2, focusTasks = [previousTask, currentTask, nextTask]);
    			}
    		}
    	};

    	return [
    		speed,
    		user,
    		focusTasks,
    		textarea,
    		enlapsedTime,
    		taskEffect,
    		addTaskEffect,
    		selectedAspects,
    		WITHOUT_PAUSE,
    		maxTime,
    		onlogin,
    		onplay,
    		onpause,
    		onrecord,
    		onstop,
    		oncheck,
    		oncheckadd,
    		onaddplay,
    		onbackadd,
    		oncancel,
    		onadd,
    		throwAction,
    		flickStart,
    		flickDetect,
    		flickEnd,
    		currentTask,
    		nextTask,
    		previousTask,
    		textarea_1_binding,
    		aspectos_checked_binding,
    		click_handler
    	];
    }

    class Home extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {}, null, [-1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Home",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/components/CompletedList.svelte generated by Svelte v3.46.6 */
    const file$1 = "src/components/CompletedList.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[4] = list[i];
    	return child_ctx;
    }

    // (127:48) 
    function create_if_block_1(ctx) {
    	let g;
    	let circle;
    	let path;

    	const block = {
    		c: function create() {
    			g = svg_element("g");
    			circle = svg_element("circle");
    			path = svg_element("path");
    			attr_dev(circle, "cx", "26.0006");
    			attr_dev(circle, "cy", "41");
    			attr_dev(circle, "r", "15");
    			attr_dev(circle, "stroke", "#2CC990");
    			attr_dev(circle, "stroke-width", "2");
    			add_location(circle, file$1, 128, 7, 5043);
    			attr_dev(path, "d", "M31.9962 33.4695L23.2247 42.3405L19.8235 38.8103C19.8235 38.8103 18.0334 37.2714 16.3328 38.8103C14.6322 40.3491 15.8853 42.3405 15.8853 42.3405L21.4346 47.9528C21.4346 47.9528 22.5874 48.7344 23.4037 48.677C24.0906 48.6287 25.0148 47.9528 25.0148 47.9528L35.7554 37.0904C35.7554 37.0904 37.0085 35.461 35.4869 33.8316C33.9653 32.2023 31.9962 33.4695 31.9962 33.4695Z");
    			attr_dev(path, "fill", "white");
    			attr_dev(path, "stroke", "#2CC990");
    			attr_dev(path, "stroke-width", "2");
    			add_location(path, file$1, 135, 7, 5170);
    			attr_dev(g, "id", "completed-task");
    			attr_dev(g, "opacity", "0.75");
    			add_location(g, file$1, 127, 6, 4997);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, g, anchor);
    			append_dev(g, circle);
    			append_dev(g, path);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(g);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(127:48) ",
    		ctx
    	});

    	return block;
    }

    // (111:5) {#if task.status === CANCELED_STATUS}
    function create_if_block(ctx) {
    	let g;
    	let circle;
    	let path;

    	const block = {
    		c: function create() {
    			g = svg_element("g");
    			circle = svg_element("circle");
    			path = svg_element("path");
    			attr_dev(circle, "cx", "26");
    			attr_dev(circle, "cy", "41");
    			attr_dev(circle, "r", "15");
    			attr_dev(circle, "stroke", "#FC6042");
    			attr_dev(circle, "stroke-width", "2");
    			add_location(circle, file$1, 112, 7, 3852);
    			attr_dev(path, "d", "M21.0399 33.64C20.8429 33.6552 20.5599 33.8 20.5599 33.8L18.7999 35.56C18.7999 35.56 18.6399 35.8424 18.6399 36.04C18.6399 36.2376 18.7999 36.52 18.7999 36.52L23.1199 41L18.7999 45.32C18.7999 45.32 18.5027 45.5759 18.4799 45.8C18.46 45.9966 18.6399 46.28 18.6399 46.28L20.5599 48.2C20.5599 48.2 20.8164 48.4921 21.0399 48.52C21.3172 48.5547 21.6799 48.2 21.6799 48.2L25.9999 44.04L30.3199 48.2C30.3199 48.2 30.7031 48.3798 30.9599 48.36C31.1569 48.3449 31.4399 48.2 31.4399 48.2L33.3599 46.28C33.3599 46.28 33.5479 45.9956 33.5199 45.8C33.5002 45.6617 33.3599 45.48 33.3599 45.48L28.8799 41L33.3599 36.52C33.3599 36.52 33.5479 36.2356 33.5199 36.04C33.5002 35.9017 33.3599 35.72 33.3599 35.72L31.4399 33.8C31.4399 33.8 31.1575 33.64 30.9599 33.64C30.7623 33.64 30.4799 33.8 30.4799 33.8L25.9999 38.12L21.6799 33.8C21.6799 33.8 21.2968 33.6202 21.0399 33.64Z");
    			attr_dev(path, "fill", "white");
    			attr_dev(path, "stroke", "#FC6042");
    			attr_dev(path, "stroke-width", "2");
    			add_location(path, file$1, 119, 7, 3974);
    			attr_dev(g, "id", "canceled-task");
    			attr_dev(g, "opacity", "0.75");
    			add_location(g, file$1, 111, 6, 3807);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, g, anchor);
    			append_dev(g, circle);
    			append_dev(g, path);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(g);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(111:5) {#if task.status === CANCELED_STATUS}",
    		ctx
    	});

    	return block;
    }

    // (37:3) {#each tasks as task}
    function create_each_block(ctx) {
    	let svg;
    	let filter;
    	let feGaussianBlur;
    	let rect;
    	let rect_fill_value;
    	let foreignObject;
    	let div1;
    	let div0;
    	let t0_value = /*task*/ ctx[4].title + "";
    	let t0;
    	let g0;
    	let circle0;
    	let path0;
    	let path1;
    	let path2;
    	let g1;
    	let circle1;
    	let path3;
    	let path4;
    	let text_1;

    	let t1_value = (/*task*/ ctx[4]
    	? new Date(/*task*/ ctx[4].time).toISOString().substring(11, 11 + 8)
    	: "") + "";

    	let t1;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*task*/ ctx[4].status === CANCELED_STATUS) return create_if_block;
    		if (/*task*/ ctx[4].status === COMPLETED_STATUS) return create_if_block_1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type && current_block_type(ctx);

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			filter = svg_element("filter");
    			feGaussianBlur = svg_element("feGaussianBlur");
    			rect = svg_element("rect");
    			foreignObject = svg_element("foreignObject");
    			div1 = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
    			div0 = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
    			t0 = text(t0_value);
    			g0 = svg_element("g");
    			circle0 = svg_element("circle");
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			path2 = svg_element("path");
    			g1 = svg_element("g");
    			circle1 = svg_element("circle");
    			path3 = svg_element("path");
    			path4 = svg_element("path");
    			if (if_block) if_block.c();
    			text_1 = svg_element("text");
    			t1 = text(t1_value);
    			attr_dev(feGaussianBlur, "in", "SourceAlpha");
    			attr_dev(feGaussianBlur, "stdDeviation", "64");
    			add_location(feGaussianBlur, file$1, 45, 6, 879);
    			attr_dev(filter, "id", "blurTask");
    			add_location(filter, file$1, 44, 5, 850);
    			attr_dev(rect, "width", "392");
    			attr_dev(rect, "height", "82");

    			attr_dev(rect, "fill", rect_fill_value = /*task*/ ctx[4].status === COMPLETED_STATUS
    			? "#2CC99040"
    			: "#FC604240");

    			add_location(rect, file$1, 47, 5, 953);
    			add_location(div0, file$1, 65, 7, 1298);
    			attr_dev(div1, "xmlns", "http://www.w3.org/1999/xhtml");
    			attr_dev(div1, "class", "completed-title");
    			add_location(div1, file$1, 61, 6, 1203);
    			attr_dev(foreignObject, "id", "title");
    			attr_dev(foreignObject, "x", "50");
    			attr_dev(foreignObject, "y", "10");
    			attr_dev(foreignObject, "width", "268");
    			attr_dev(foreignObject, "height", "62");
    			add_location(foreignObject, file$1, 54, 5, 1096);
    			attr_dev(circle0, "cx", "368");
    			attr_dev(circle0, "cy", "41");
    			attr_dev(circle0, "r", "15.5");
    			attr_dev(circle0, "fill", "#FC6042");
    			attr_dev(circle0, "stroke", "black");
    			add_location(circle0, file$1, 71, 6, 1445);
    			attr_dev(path0, "d", "M365.1 31.313V33.6645H370.869V31.313L370.716 30.8346L370.147 30.6815H365.841L365.273 30.9111L365.1 31.313Z");
    			attr_dev(path0, "fill", "white");
    			add_location(path0, file$1, 78, 6, 1559);
    			attr_dev(path1, "d", "M370.869 33.6645H365.1H361.306L362.218 49.2544L362.775 50.5373L363.798 50.9092H372.369L373.429 50.3514L373.745 49.2544L374.786 33.6645H370.869Z");
    			attr_dev(path1, "fill", "white");
    			add_location(path1, file$1, 82, 6, 1718);
    			attr_dev(path2, "d", "M359.655 33.6645H361.306M365.1 33.6645V31.313L365.273 30.9111L365.841 30.6815H370.147L370.716 30.8346L370.869 31.313V33.6645M365.1 33.6645H370.869M365.1 33.6645H361.306M370.869 33.6645H374.786M376.385 33.6645H374.786M374.786 33.6645L373.745 49.2544L373.429 50.3514L372.369 50.9092H363.798L362.775 50.5373L362.218 49.2544L361.306 33.6645M364.449 36.2393L365.137 48.3433M367.981 48.3433V36.2393M371.57 36.2393L370.863 48.3433");
    			attr_dev(path2, "stroke", "black");
    			add_location(path2, file$1, 86, 6, 1914);
    			attr_dev(g0, "id", "remove-task");
    			attr_dev(g0, "opacity", "0.75");
    			add_location(g0, file$1, 70, 5, 1379);
    			attr_dev(circle1, "cx", "334");
    			attr_dev(circle1, "cy", "41");
    			attr_dev(circle1, "r", "15.5");
    			attr_dev(circle1, "fill", "#2C82C9");
    			attr_dev(circle1, "stroke", "black");
    			add_location(circle1, file$1, 92, 6, 2467);
    			attr_dev(path3, "d", "M323.892 40.93C323.884 40.3828 323.892 39.5375 323.892 39.5375H327.767V40.9198C327.767 44.8798 331.072 47.2613 333.939 47.2613C337.394 47.2613 339.188 44.5134 339.188 44.5134L338.286 43.7677C338.286 43.7677 338.226 43.689 338.256 43.6335C338.286 43.5781 338.394 43.5981 338.394 43.5981H343.009V48.1387C343.009 48.1387 342.967 48.2977 342.889 48.3021C342.811 48.3066 342.675 48.1387 342.675 48.1387L341.899 47.2613C341.899 47.2613 339.192 51.0794 333.939 51.0794C328.575 51.0794 323.981 46.727 323.892 40.93Z");
    			attr_dev(path3, "fill", "white");
    			attr_dev(path3, "stroke", "black");
    			add_location(path3, file$1, 99, 6, 2581);
    			attr_dev(path4, "d", "M344.148 41.047C344.156 41.5942 344.148 42.4394 344.148 42.4394H340.273V41.0572C340.273 37.0972 336.968 34.7156 334.101 34.7156C330.646 34.7156 328.852 37.4635 328.852 37.4635L329.754 38.2093C329.754 38.2093 329.814 38.288 329.784 38.3434C329.754 38.3988 329.646 38.3789 329.646 38.3789L325.031 38.3789V33.8383C325.031 33.8383 325.073 33.6793 325.151 33.6748C325.229 33.6704 325.365 33.8383 325.365 33.8383L326.141 34.7156C326.141 34.7156 328.848 30.8975 334.101 30.8975C339.465 30.8975 344.058 35.25 344.148 41.047Z");
    			attr_dev(path4, "fill", "white");
    			attr_dev(path4, "stroke", "black");
    			add_location(path4, file$1, 104, 6, 3163);
    			attr_dev(g1, "id", "reopen-task");
    			attr_dev(g1, "opacity", "0.75");
    			add_location(g1, file$1, 91, 5, 2401);
    			attr_dev(text_1, "id", "title");
    			attr_dev(text_1, "x", "304");
    			attr_dev(text_1, "y", "78");
    			attr_dev(text_1, "font-size", "22");
    			attr_dev(text_1, "fill", "white");
    			add_location(text_1, file$1, 143, 5, 5664);
    			attr_dev(svg, "width", "392");
    			attr_dev(svg, "height", "82");
    			attr_dev(svg, "viewBox", "0 0 392 82");
    			attr_dev(svg, "fill", "none");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			add_location(svg, file$1, 37, 4, 717);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, filter);
    			append_dev(filter, feGaussianBlur);
    			append_dev(svg, rect);
    			append_dev(svg, foreignObject);
    			append_dev(foreignObject, div1);
    			append_dev(div1, div0);
    			append_dev(div0, t0);
    			append_dev(svg, g0);
    			append_dev(g0, circle0);
    			append_dev(g0, path0);
    			append_dev(g0, path1);
    			append_dev(g0, path2);
    			append_dev(svg, g1);
    			append_dev(g1, circle1);
    			append_dev(g1, path3);
    			append_dev(g1, path4);
    			if (if_block) if_block.m(svg, null);
    			append_dev(svg, text_1);
    			append_dev(text_1, t1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(
    						g0,
    						"click",
    						function () {
    							if (is_function(/*remove*/ ctx[2](/*task*/ ctx[4]))) /*remove*/ ctx[2](/*task*/ ctx[4]).apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(
    						g1,
    						"click",
    						function () {
    							if (is_function(/*reopen*/ ctx[3](/*task*/ ctx[4]))) /*reopen*/ ctx[3](/*task*/ ctx[4]).apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*tasks*/ 1 && rect_fill_value !== (rect_fill_value = /*task*/ ctx[4].status === COMPLETED_STATUS
    			? "#2CC99040"
    			: "#FC604240")) {
    				attr_dev(rect, "fill", rect_fill_value);
    			}

    			if (dirty & /*tasks*/ 1 && t0_value !== (t0_value = /*task*/ ctx[4].title + "")) set_data_dev(t0, t0_value);

    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if (if_block) if_block.d(1);
    				if_block = current_block_type && current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(svg, text_1);
    				}
    			}

    			if (dirty & /*tasks*/ 1 && t1_value !== (t1_value = (/*task*/ ctx[4]
    			? new Date(/*task*/ ctx[4].time).toISOString().substring(11, 11 + 8)
    			: "") + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);

    			if (if_block) {
    				if_block.d();
    			}

    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(37:3) {#each tasks as task}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let g1;
    	let foreignObject;
    	let div;
    	let t;
    	let g0;
    	let circle;
    	let path;
    	let mounted;
    	let dispose;
    	let each_value = /*tasks*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			g1 = svg_element("g");
    			foreignObject = svg_element("foreignObject");
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    			g0 = svg_element("g");
    			circle = svg_element("circle");
    			path = svg_element("path");
    			attr_dev(div, "class", "scrollable");
    			add_location(div, file$1, 35, 2, 663);
    			attr_dev(foreignObject, "x", "20");
    			attr_dev(foreignObject, "y", "20");
    			attr_dev(foreignObject, "width", "432");
    			attr_dev(foreignObject, "height", "612");
    			add_location(foreignObject, file$1, 34, 1, 606);
    			attr_dev(circle, "id", "Ellipse 3");
    			attr_dev(circle, "cx", "71");
    			attr_dev(circle, "cy", "696");
    			attr_dev(circle, "r", "49.5");
    			attr_dev(circle, "fill", "#FCB941");
    			attr_dev(circle, "stroke", "black");
    			add_location(circle, file$1, 161, 2, 5990);
    			attr_dev(path, "id", "Vector 21");
    			attr_dev(path, "d", "M107.473 696.106C107.473 687.41 99.8757 688.142 99.8757 688.142H72.5053V673.129L32.6855 696.106L72.5053 719.357V704.802H99.8757C99.8757 704.802 107.473 704.802 107.473 696.106Z");
    			attr_dev(path, "fill", "white");
    			attr_dev(path, "stroke", "black");
    			add_location(path, file$1, 169, 2, 6094);
    			attr_dev(g0, "id", "back_home");
    			attr_dev(g0, "opacity", "0.75");
    			add_location(g0, file$1, 160, 1, 5934);
    			attr_dev(g1, "id", "CompletedList");
    			add_location(g1, file$1, 33, 0, 582);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, g1, anchor);
    			append_dev(g1, foreignObject);
    			append_dev(foreignObject, div);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			append_dev(div, t);
    			append_dev(g1, g0);
    			append_dev(g0, circle);
    			append_dev(g0, path);

    			if (!mounted) {
    				dispose = listen_dev(g0, "click", /*backhome*/ ctx[1], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*tasks, Date, CANCELED_STATUS, COMPLETED_STATUS, reopen, remove*/ 13) {
    				each_value = /*tasks*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, t);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(g1);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('CompletedList', slots, []);
    	let tasks = [];

    	tasksStore.subscribe(value => {
    		$$invalidate(0, tasks = value.filter(task => task.status === CANCELED_STATUS || task.status === COMPLETED_STATUS));

    		// reverse array
    		tasks.reverse();
    	});

    	function backhome() {
    		push("/");
    	}

    	function remove(task) {
    		removeTask(task);
    	}

    	function reopen(task) {
    		reopenTask(task);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<CompletedList> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		push,
    		tasksStore,
    		CANCELED_STATUS,
    		COMPLETED_STATUS,
    		removeTask,
    		reopenTask,
    		_: translation,
    		tasks,
    		backhome,
    		remove,
    		reopen
    	});

    	$$self.$inject_state = $$props => {
    		if ('tasks' in $$props) $$invalidate(0, tasks = $$props.tasks);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [tasks, backhome, remove, reopen];
    }

    class CompletedList extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CompletedList",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.46.6 */
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let svg0;
    	let filter;
    	let feGaussianBlur;
    	let image;
    	let t;
    	let div;
    	let svg1;
    	let router;
    	let current;

    	router = new Router({
    			props: { routes: /*routes*/ ctx[0] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			svg0 = svg_element("svg");
    			filter = svg_element("filter");
    			feGaussianBlur = svg_element("feGaussianBlur");
    			image = svg_element("image");
    			t = space();
    			div = element("div");
    			svg1 = svg_element("svg");
    			create_component(router.$$.fragment);
    			attr_dev(feGaussianBlur, "in", "SourceGraphic");
    			attr_dev(feGaussianBlur, "stdDeviation", "2");
    			add_location(feGaussianBlur, file, 23, 2, 518);
    			attr_dev(filter, "id", "blurMe");
    			add_location(filter, file, 22, 1, 495);
    			attr_dev(image, "href", "background.jpg");
    			attr_dev(image, "filter", "url(#blurMe)");
    			attr_dev(image, "class", "bg-image");
    			add_location(image, file, 26, 1, 586);
    			attr_dev(svg0, "width", "100%");
    			attr_dev(svg0, "height", "100%");
    			attr_dev(svg0, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg0, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr_dev(svg0, "class", "background");
    			add_location(svg0, file, 15, 0, 358);
    			attr_dev(svg1, "height", "100%");
    			attr_dev(svg1, "viewBox", "0 0 432 768");
    			attr_dev(svg1, "fill", "none");
    			attr_dev(svg1, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg1, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			add_location(svg1, file, 32, 1, 687);
    			attr_dev(div, "class", "main");
    			add_location(div, file, 29, 0, 665);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg0, anchor);
    			append_dev(svg0, filter);
    			append_dev(filter, feGaussianBlur);
    			append_dev(svg0, image);
    			insert_dev(target, t, anchor);
    			insert_dev(target, div, anchor);
    			append_dev(div, svg1);
    			mount_component(router, svg1, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(router.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(router.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg0);
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(div);
    			destroy_component(router);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);

    	let routes = {
    		"/": Home,
    		"/login": Login,
    		"/completed": CompletedList
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		_: translation,
    		Login,
    		Home,
    		CompletedList,
    		Router,
    		routes
    	});

    	$$self.$inject_state = $$props => {
    		if ('routes' in $$props) $$invalidate(0, routes = $$props.routes);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [routes];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    	}
    });

    /**
     * Read in a Blob value and return it as a base64 string
     * @param blob The blob value to convert to a base64 string
     */
    const readBlobAsBase64 = async (blob) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64String = reader.result;
            const base64StringWithoutTags = base64String.substr(base64String.indexOf(',') + 1); // remove prefix "data:application/pdf;base64,"
            resolve(base64StringWithoutTags);
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(blob);
    });
    /**
     * Safely web encode a string value (inspired by js-cookie)
     * @param str The string value to encode
     */
    const encode = (str) => encodeURIComponent(str)
        .replace(/%(2[346B]|5E|60|7C)/g, decodeURIComponent)
        .replace(/[()]/g, escape);
    /**
     * Safely web decode a string value (inspired by js-cookie)
     * @param str The string value to decode
     */
    const decode = (str) => str.replace(/(%[\dA-F]{2})+/gi, decodeURIComponent);

    /**
     * Set a cookie
     * @param key The key to set
     * @param value The value to set
     * @param options Optional additional parameters
     */
    const setCookie = (key, value, options = {}) => {
        // Safely Encoded Key/Value
        const encodedKey = encode(key);
        const encodedValue = encode(value);
        // Clean & sanitize options
        const expires = `; expires=${(options.expires || '').replace('expires=', '')}`; // Default is "; expires="
        const path = (options.path || '/').replace('path=', ''); // Default is "path=/"
        document.cookie = `${encodedKey}=${encodedValue || ''}${expires}; path=${path}`;
    };
    /**
     * Gets all HttpCookies
     */
    const getCookies = () => {
        const output = [];
        const map = {};
        if (!document.cookie) {
            return output;
        }
        const cookies = document.cookie.split(';') || [];
        for (const cookie of cookies) {
            // Replace first "=" with CAP_COOKIE to prevent splitting on additional "="
            let [k, v] = cookie.replace(/=/, 'CAP_COOKIE').split('CAP_COOKIE');
            k = decode(k).trim();
            v = decode(v).trim();
            map[k] = v;
        }
        const entries = Object.entries(map);
        for (const [key, value] of entries) {
            output.push({
                key,
                value,
            });
        }
        return output;
    };
    /**
     * Gets a single HttpCookie given a key
     */
    const getCookie = (key) => {
        const cookies = getCookies();
        for (const cookie of cookies) {
            if (cookie.key === key) {
                return cookie;
            }
        }
        return {
            key,
            value: '',
        };
    };
    /**
     * Deletes a cookie given a key
     * @param key The key of the cookie to delete
     */
    const deleteCookie = (key) => {
        document.cookie = `${key}=; Max-Age=0`;
    };
    /**
     * Clears out cookies by setting them to expire immediately
     */
    const clearCookies = () => {
        const cookies = document.cookie.split(';') || [];
        for (const cookie of cookies) {
            document.cookie = cookie
                .replace(/^ +/, '')
                .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
        }
    };

    /**
     * Normalize an HttpHeaders map by lowercasing all of the values
     * @param headers The HttpHeaders object to normalize
     */
    const normalizeHttpHeaders = (headers = {}) => {
        const originalKeys = Object.keys(headers);
        const loweredKeys = Object.keys(headers).map(k => k.toLocaleLowerCase());
        const normalized = loweredKeys.reduce((acc, key, index) => {
            acc[key] = headers[originalKeys[index]];
            return acc;
        }, {});
        return normalized;
    };
    /**
     * Builds a string of url parameters that
     * @param params A map of url parameters
     * @param shouldEncode true if you should encodeURIComponent() the values (true by default)
     */
    const buildUrlParams = (params, shouldEncode = true) => {
        if (!params)
            return null;
        const output = Object.entries(params).reduce((accumulator, entry) => {
            const [key, value] = entry;
            let encodedValue;
            let item;
            if (Array.isArray(value)) {
                item = '';
                value.forEach(str => {
                    encodedValue = shouldEncode ? encodeURIComponent(str) : str;
                    item += `${key}=${encodedValue}&`;
                });
                // last character will always be "&" so slice it off
                item.slice(0, -1);
            }
            else {
                encodedValue = shouldEncode ? encodeURIComponent(value) : value;
                item = `${key}=${encodedValue}`;
            }
            return `${accumulator}&${item}`;
        }, '');
        // Remove initial "&" from the reduce
        return output.substr(1);
    };
    /**
     * Build the RequestInit object based on the options passed into the initial request
     * @param options The Http plugin options
     * @param extra Any extra RequestInit values
     */
    const buildRequestInit = (options, extra = {}) => {
        const output = Object.assign({ method: options.method || 'GET', headers: options.headers }, extra);
        // Get the content-type
        const headers = normalizeHttpHeaders(options.headers);
        const type = headers['content-type'] || '';
        // If body is already a string, then pass it through as-is.
        if (typeof options.data === 'string') {
            output.body = options.data;
        }
        // Build request initializers based off of content-type
        else if (type.includes('application/x-www-form-urlencoded')) {
            const params = new URLSearchParams();
            for (const [key, value] of Object.entries(options.data || {})) {
                params.set(key, value);
            }
            output.body = params.toString();
        }
        else if (type.includes('multipart/form-data')) {
            const form = new FormData();
            if (options.data instanceof FormData) {
                options.data.forEach((value, key) => {
                    form.append(key, value);
                });
            }
            else {
                for (let key of Object.keys(options.data)) {
                    form.append(key, options.data[key]);
                }
            }
            output.body = form;
            const headers = new Headers(output.headers);
            headers.delete('content-type'); // content-type will be set by `window.fetch` to includy boundary
            output.headers = headers;
        }
        else if (type.includes('application/json') ||
            typeof options.data === 'object') {
            output.body = JSON.stringify(options.data);
        }
        return output;
    };
    /**
     * Perform an Http request given a set of options
     * @param options Options to build the HTTP request
     */
    const request = async (options) => {
        const requestInit = buildRequestInit(options, options.webFetchExtra);
        const urlParams = buildUrlParams(options.params, options.shouldEncodeUrlParams);
        const url = urlParams ? `${options.url}?${urlParams}` : options.url;
        const response = await fetch(url, requestInit);
        const contentType = response.headers.get('content-type') || '';
        // Default to 'text' responseType so no parsing happens
        let { responseType = 'text' } = response.ok ? options : {};
        // If the response content-type is json, force the response to be json
        if (contentType.includes('application/json')) {
            responseType = 'json';
        }
        let data;
        switch (responseType) {
            case 'arraybuffer':
            case 'blob':
                const blob = await response.blob();
                data = await readBlobAsBase64(blob);
                break;
            case 'json':
                data = await response.json();
                break;
            case 'document':
            case 'text':
            default:
                data = await response.text();
        }
        // Convert fetch headers to Capacitor HttpHeaders
        const headers = {};
        response.headers.forEach((value, key) => {
            headers[key] = value;
        });
        return {
            data,
            headers,
            status: response.status,
            url: response.url,
        };
    };
    /**
     * Perform an Http GET request given a set of options
     * @param options Options to build the HTTP request
     */
    const get = async (options) => request(Object.assign(Object.assign({}, options), { method: 'GET' }));
    /**
     * Perform an Http POST request given a set of options
     * @param options Options to build the HTTP request
     */
    const post = async (options) => request(Object.assign(Object.assign({}, options), { method: 'POST' }));
    /**
     * Perform an Http PUT request given a set of options
     * @param options Options to build the HTTP request
     */
    const put = async (options) => request(Object.assign(Object.assign({}, options), { method: 'PUT' }));
    /**
     * Perform an Http PATCH request given a set of options
     * @param options Options to build the HTTP request
     */
    const patch = async (options) => request(Object.assign(Object.assign({}, options), { method: 'PATCH' }));
    /**
     * Perform an Http DELETE request given a set of options
     * @param options Options to build the HTTP request
     */
    const del = async (options) => request(Object.assign(Object.assign({}, options), { method: 'DELETE' }));

    class HttpWeb extends WebPlugin {
        constructor() {
            super();
            /**
             * Perform an Http request given a set of options
             * @param options Options to build the HTTP request
             */
            this.request = async (options) => request(options);
            /**
             * Perform an Http GET request given a set of options
             * @param options Options to build the HTTP request
             */
            this.get = async (options) => get(options);
            /**
             * Perform an Http POST request given a set of options
             * @param options Options to build the HTTP request
             */
            this.post = async (options) => post(options);
            /**
             * Perform an Http PUT request given a set of options
             * @param options Options to build the HTTP request
             */
            this.put = async (options) => put(options);
            /**
             * Perform an Http PATCH request given a set of options
             * @param options Options to build the HTTP request
             */
            this.patch = async (options) => patch(options);
            /**
             * Perform an Http DELETE request given a set of options
             * @param options Options to build the HTTP request
             */
            this.del = async (options) => del(options);
            /**
             * Gets all HttpCookies as a Map
             */
            this.getCookiesMap = async (
            // @ts-ignore
            options) => {
                const cookies = getCookies();
                const output = {};
                for (const cookie of cookies) {
                    output[cookie.key] = cookie.value;
                }
                return output;
            };
            /**
             * Get all HttpCookies as an object with the values as an HttpCookie[]
             */
            this.getCookies = async (options) => {
                const cookies = getCookies();
                return { cookies };
            };
            /**
             * Set a cookie
             * @param key The key to set
             * @param value The value to set
             * @param options Optional additional parameters
             */
            this.setCookie = async (options) => {
                const { key, value, expires = '', path = '' } = options;
                setCookie(key, value, { expires, path });
            };
            /**
             * Gets all cookie values unless a key is specified, then return only that value
             * @param key The key of the cookie value to get
             */
            this.getCookie = async (options) => getCookie(options.key);
            /**
             * Deletes a cookie given a key
             * @param key The key of the cookie to delete
             */
            this.deleteCookie = async (options) => deleteCookie(options.key);
            /**
             * Clears out cookies by setting them to expire immediately
             */
            this.clearCookies = async (
            // @ts-ignore
            options) => clearCookies();
            /**
             * Clears out cookies by setting them to expire immediately
             */
            this.clearAllCookies = async () => clearCookies();
            /**
             * Uploads a file through a POST request
             * @param options TODO
             */
            this.uploadFile = async (options) => {
                const formData = new FormData();
                formData.append(options.name, options.blob || 'undefined');
                const fetchOptions = Object.assign(Object.assign({}, options), { body: formData, method: 'POST' });
                return this.post(fetchOptions);
            };
            /**
             * Downloads a file
             * @param options TODO
             */
            this.downloadFile = async (options) => {
                const requestInit = buildRequestInit(options, options.webFetchExtra);
                const response = await fetch(options.url, requestInit);
                let blob;
                if (!(options === null || options === void 0 ? void 0 : options.progress))
                    blob = await response.blob();
                else if (!(response === null || response === void 0 ? void 0 : response.body))
                    blob = new Blob();
                else {
                    const reader = response.body.getReader();
                    let bytes = 0;
                    let chunks = [];
                    const contentType = response.headers.get('content-type');
                    const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done)
                            break;
                        chunks.push(value);
                        bytes += (value === null || value === void 0 ? void 0 : value.length) || 0;
                        const status = {
                            type: 'DOWNLOAD',
                            url: options.url,
                            bytes,
                            contentLength,
                        };
                        this.notifyListeners('progress', status);
                    }
                    let allChunks = new Uint8Array(bytes);
                    let position = 0;
                    for (const chunk of chunks) {
                        if (typeof chunk === 'undefined')
                            continue;
                        allChunks.set(chunk, position);
                        position += chunk.length;
                    }
                    blob = new Blob([allChunks.buffer], { type: contentType || undefined });
                }
                return {
                    blob,
                };
            };
        }
    }

    var web$1 = /*#__PURE__*/Object.freeze({
        __proto__: null,
        HttpWeb: HttpWeb
    });

    class LocalNotificationsWeb extends WebPlugin {
        constructor() {
            super(...arguments);
            this.pending = [];
            this.hasNotificationSupport = () => {
                if (!('Notification' in window) || !Notification.requestPermission) {
                    return false;
                }
                if (Notification.permission !== 'granted') {
                    // don't test for `new Notification` if permission has already been granted
                    // otherwise this sends a real notification on supported browsers
                    try {
                        new Notification('');
                    }
                    catch (e) {
                        if (e.name == 'TypeError') {
                            return false;
                        }
                    }
                }
                return true;
            };
        }
        async createChannel() {
            throw this.unimplemented('Not implemented on web.');
        }
        async deleteChannel() {
            throw this.unimplemented('Not implemented on web.');
        }
        async listChannels() {
            throw this.unimplemented('Not implemented on web.');
        }
        async schedule(options) {
            if (!this.hasNotificationSupport()) {
                throw this.unavailable('Notifications not supported in this browser.');
            }
            for (const notification of options.notifications) {
                this.sendNotification(notification);
            }
            return {
                notifications: options.notifications.map(notification => ({
                    id: notification.id,
                })),
            };
        }
        async getPending() {
            return {
                notifications: this.pending,
            };
        }
        async registerActionTypes() {
            throw this.unimplemented('Not implemented on web.');
        }
        async cancel(pending) {
            this.pending = this.pending.filter(notification => !pending.notifications.find(n => n.id === notification.id));
        }
        async areEnabled() {
            const { display } = await this.checkPermissions();
            return {
                value: display === 'granted',
            };
        }
        async requestPermissions() {
            if (!this.hasNotificationSupport()) {
                throw this.unavailable('Notifications not supported in this browser.');
            }
            const display = this.transformNotificationPermission(await Notification.requestPermission());
            return { display };
        }
        async checkPermissions() {
            if (!this.hasNotificationSupport()) {
                throw this.unavailable('Notifications not supported in this browser.');
            }
            const display = this.transformNotificationPermission(Notification.permission);
            return { display };
        }
        transformNotificationPermission(permission) {
            switch (permission) {
                case 'granted':
                    return 'granted';
                case 'denied':
                    return 'denied';
                default:
                    return 'prompt';
            }
        }
        sendPending() {
            var _a;
            const toRemove = [];
            const now = new Date().getTime();
            for (const notification of this.pending) {
                if (((_a = notification.schedule) === null || _a === void 0 ? void 0 : _a.at) &&
                    notification.schedule.at.getTime() <= now) {
                    this.buildNotification(notification);
                    toRemove.push(notification);
                }
            }
            this.pending = this.pending.filter(notification => !toRemove.find(n => n === notification));
        }
        sendNotification(notification) {
            var _a;
            if ((_a = notification.schedule) === null || _a === void 0 ? void 0 : _a.at) {
                const diff = notification.schedule.at.getTime() - new Date().getTime();
                this.pending.push(notification);
                setTimeout(() => {
                    this.sendPending();
                }, diff);
                return;
            }
            this.buildNotification(notification);
        }
        buildNotification(notification) {
            const localNotification = new Notification(notification.title, {
                body: notification.body,
            });
            localNotification.addEventListener('click', this.onClick.bind(this, notification), false);
            localNotification.addEventListener('show', this.onShow.bind(this, notification), false);
            return localNotification;
        }
        onClick(notification) {
            const data = {
                actionId: 'tap',
                notification,
            };
            this.notifyListeners('localNotificationActionPerformed', data);
        }
        onShow(notification) {
            this.notifyListeners('localNotificationReceived', notification);
        }
    }

    var web = /*#__PURE__*/Object.freeze({
        __proto__: null,
        LocalNotificationsWeb: LocalNotificationsWeb
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
