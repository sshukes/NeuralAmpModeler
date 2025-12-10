namespace NeuralAmpModeler.SignalProcessing;

public static class SignalGenerator
{
    public static IReadOnlyList<double> GenerateTestSignal(int samples, double frequency, double sampleRate, double drive = 0.8)
    {
        var output = new double[samples];
        for (var n = 0; n < samples; n++)
        {
            var t = n / sampleRate;
            var sine = Math.Sin(2 * Math.PI * frequency * t) * drive;
            var harmonic = Math.Sin(2 * Math.PI * frequency * 2 * t) * (drive * 0.25);
            output[n] = sine + harmonic;
        }

        return output;
    }
}
