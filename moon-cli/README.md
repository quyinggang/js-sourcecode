# Moon Cli

:sparkles: A CLI to scaffold Moon applications

### Installation

Install with npm:

```sh
$ npm install moon-cli -g
```

### Getting Started

Create your first project with:

```sh
$ moon init <name>
```

`<name>` is the name of your application, and Moon will proceed to create the directory and install the template there.

Next, move into the directory, install the dependencies, and run a dev server!

```sh
$ cd <name>
$ npm install
$ npm run dev
```

### Production

To build a minified bundle, run:

```sh
$ npm run build
```

All html, css, and javascript will be minified and bundled accordingly.

### License

Licensed under the [MIT License](https://kbrsh.github.io/license) by [Kabir Shah](https://kabir.ml)
