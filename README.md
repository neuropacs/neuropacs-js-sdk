# NeuroPACS JS SDK v1.0

Connect to NeuroPACS diagnostic capabilities with our JavaScript SDK.

<!-- ## Description

An in-depth paragraph about your project and overview of use. -->

## Getting Started

### Dependencies

- SocketIO SDK: [Download Here](https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.7.2/socket.io.min.js)

### Installation

There are several bundles available:

| Name             | Size | Description                       |
| ---------------- | ---- | --------------------------------- |
| neuropacs.js     | 20KB | Unminified version, with debug    |
| neuropacs.min.js | 11KB | Production version, without debug |

### Usage

#### Option 1: Download SDK

- Download prefered bundle for NeuroPACS
- Download minified bundle for SocketIO (socket.io.min.js)
- Include in project
  - Your project strucutre should look something like this:

```
project-root/
|-- src/
| |-- script.py
|-- lib/
| |-- neuropacs.min.js
| |-- socket.io.min.js
```

- Reference SDK

```
<script >
    async function main() {
        const npcs = new Neuropacs(apiKey, serverUrl, socketIOPath);
    }
</script>
```

#### Option 2: Inlcude in HTML

```
<head>
<!-- SOCKET IO SDK -->
<script src="https://cdn.socket.io/4.7.2/socket.io.min.js" integrity="sha384-mZLF4UVrpi/QTWPA7BjNPEnkIfRFn4ZEO3Qt/HFklTJBj/gBOV8G3HcKn4NfQblz" crossorigin="anonymous"></script>

<!-- NEUROPACS SDK -->
<script src="INSERT NEUROPACS URL"></script>
</head>

<script >
    async function main() {
        const npcs = new Neuropacs(apiKey, serverUrl, socketIOPath);
    }
</script>

```

## Authors

Kerrick Cavanaugh - kerrick@neuropacs.com

## Version History

- 1.0
  - Initial Release

## License

This project is licensed under the MIT License - see the LICENSE.md file for details
