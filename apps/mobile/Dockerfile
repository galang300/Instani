FROM ghcr.io/cirruslabs/flutter:stable
WORKDIR /app
COPY pubspec.yaml ./
RUN flutter pub get
COPY . .
RUN flutter analyze
CMD ["flutter", "test", "--no-pub", "--reporter", "expanded"]
