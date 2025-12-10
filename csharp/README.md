# Windows NAM Trainer (C#)

This directory contains a self-contained Windows desktop application written in C# and WPF that mirrors the training UI from the React/Python version of the Neural Amp Modeler tools.

## Features
- Local file selection for DI input and reamped output audio.
- Quick inspection and mock latency estimation to match the original workflow steps.
- Editable training hyperparameters (architecture, epochs, batch size, learning rate, device).
- Metadata capture for modeled gear and tags.
- Run tracking with in-memory history, live status updates, and simulated metrics output.
- Inline logging panel for user feedback.

## Getting started
1. Install the [.NET 8 SDK](https://dotnet.microsoft.com/en-us/download/dotnet/8.0) on Windows.
2. Open `NamTrainerApp.sln` in Visual Studio 2022 (or newer) or run `dotnet build` from the repository root.
3. Set `NamTrainerApp` as the startup project and press **F5** to launch the trainer.

> Note: the current implementation uses simulated training and metrics; wire up your native NAM training pipeline where `SimulateTrainingAsync` is invoked in `MainWindow.xaml.cs`.
