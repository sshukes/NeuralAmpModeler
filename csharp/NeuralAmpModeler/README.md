# Neural Amp Modeler (C#)

A simple console implementation of a neural amplifier modeler written in C#. The app loads a small multi-layer perceptron described in JSON, runs a signal through the network, and prints useful statistics about the processed tone.

## Prerequisites

- .NET 8 SDK or newer
- Optional: an input CSV file containing one amplitude value per line

## Running locally

```bash
# From the repository root
cd csharp/NeuralAmpModeler

dotnet run -- \
  --model sample_model.json \
  --print
```

You can target a custom input file and save the result:

```bash
dotnet run -- --model sample_model.json --input my_signal.csv --output processed.csv
```

### What the program does
1. Loads the neural network layers from the provided JSON model file.
2. Uses either the provided input CSV or a generated harmonic-rich sine test tone.
3. Runs each sample through the neural network with a configurable output gain.
4. Prints min/max/RMS statistics and (optionally) the first few processed samples.

### Project layout
- `Program.cs` wires together option parsing, model loading, and processing.
- `CliOptions.cs` handles the small command-line interface.
- `Model/` contains a dense layer implementation and the `NeuralAmpModel` runner.
- `IO/` includes helpers for loading models and reading/writing signals as CSV.
- `SignalProcessing/` provides analysis utilities and a simple signal generator.
- `sample_model.json` is a ready-to-run example network.

### Notes
- If you do not have the .NET SDK locally, you can still inspect the code and model file. Building and running requires the SDK.
- The neural model is intentionally small and CPU-friendly so that it can run in real time when expanded.
