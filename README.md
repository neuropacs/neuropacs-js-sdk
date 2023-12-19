[![Unit Tests](https://github.com/neuropacs/neuropacs-js-sdk/actions/workflows/ci.yaml/badge.svg?branch=main)](https://github.com/neuropacs/neuropacs-js-sdk/actions/workflows/ci.yaml)

# NeuroPACS JS SDK v1.0

Connect to NeuroPACS diagnostic capabilities with our JavaScript SDK.

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

<!-- #### Option 1: Download SDK

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
``` -->

<!-- #### Inlcude in HTML -->

```
<head>
<!-- NEUROPACS SDK -->
<script src="https://neuropacs.com/js/src/neuropacs.min.js"></script>
</head>
<script>
      async function main() {
        const apiKey = "your_api_key";
        const serverUrl = "http://your_neuropacs_url:5000";
        const productId = "PD/MSA/PSP-v1.0";
        const format = "XML";

        try {
          // INITIALIZE NEUROPACS SDK
          const npcs = new Neuropacs(apiKey, serverUrl);

          // GENERATE AN AES KEY
          const aesKey = npcs.generateAesKey();

          // CONNECT TO NEUROPACS
          const connectionID = await npcs.connect(apiKey, aesKey);

          // CREATE A NEW JOB
          const orderID = await npcs.newJob(connectionID, aesKey);

          // UPLOAD A FILE/DATASET
          const blobData1 = new Blob(["Hello, world!"], { type: "text/plain" });
          const file1 = new File([blobData1], "example1.txt", {
            type: "text/plain"
          });
          const blobData2 = new Blob(["Hello, world!"], { type: "text/plain" });
          const file2 = new File([blobData2], "example2.txt", {
            type: "text/plain"
          });
          const blobData3 = new Blob(["Hello, world!"], { type: "text/plain" });
          const file3 = new File([blobData3], "example3.txt", {
            type: "text/plain"
          });
          const dataset = [file1, file2, file3];
          const uploadStatus = await npcs.uploadDataset(
            dataset,
            orderID,
            connectionID,
            aesKey
          );

          //START A JOB
          const job = await npcs.runJob(
            productId,
            orderID,
            connectionID,
            aesKey
          );

          // CHECK STATUS
          const status = await npcs.checkStatus(orderID, connectionID, aesKey);

          // GET RESULTS
          const results = await npcs.getResults(
            format,
            orderID,
            connectionID,
            aesKey
          );
        } catch (e) {
          console.log(e);
        }
      }
      main();
    </script>

```

## Authors

Kerrick Cavanaugh - kerrick@neuropacs.com

## Version History

- 1.0
  - Initial Release

## License

This project is licensed under the MIT License - see the LICENSE.md file for details
