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
        const predictionFormat = "XML";

        try {
          // INITIALIZE NEUROPACS SDK
          const npcs = Neuropacs.init(apiKey, serverUrl);

          // CONNECT TO NEUROPACS
          const connection = await npcs.connect();

          // CREATE A NEW JOB
          const orderID = await npcs.newJob();

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
          // --> orderId is optional
          const uploadStatus = await npcs.uploadDataset(dataset);

          //START A JOB
          // --> orderId is optional
          const job = await npcs.runJob(productId);

          // CHECK STATUS
          // --> orderId is optional
          const status = await npcs.checkStatus();

          // GET RESULTS
          // --> orderId is optional
          const results = await npcs.getResults(predictionFormat);
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
