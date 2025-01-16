/*
 * Copyright 2023 knanao.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { expect } from "chai";

import { parseServiceManifest } from "./cloudrun";

describe("cloudrun", () => {
  it("should load safely", () => {
    const data = `
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  annotations:
    run.googleapis.com/client-name: cloud-console
    run.googleapis.com/ingress: all
    run.googleapis.com/ingress-status: all
  creationTimestamp: '2022-02-28T08:36:32.176035Z'
  generation: 153
  labels:
    cloud.googleapis.com/location: asia-northeast1
  name: helloworld
  namespace: 'xxxxxxxxxx'
  resourceVersion: AAX4CQw8EkQ
  selfLink: /apis/serving.knative.dev/v1/namespaces/xxxxxxxxxx/services/helloworld
  uid: d2023724-21df-8544ff6b7b47
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/maxScale: '1'
      labels:
      name: helloworld-v001-aa3e4b2
    spec:
      containerConcurrency: 80
      containers:
      - args:
        - server
        image: gcr.io/cloudrun/hello:latest
        ports:
        - containerPort: 9085
          name: http1
        resources:
          limits:
            cpu: 1000m
            memory: 128Mi
      serviceAccountName: xxxxxxxxxx-compute@developer.gserviceaccount.com
      timeoutSeconds: 300
  traffic:
  - percent: 100
    revisionName: helloworld-v001-aa3e4b2
`;
    const res = parseServiceManifest(data);

    expect(res.getAPIVersion()).to.equal("serving.knative.dev/v1");
    expect(res.getServiceName()).to.equal("helloworld");
    expect(res.getImage()).to.equal("gcr.io/cloudrun/hello:latest");
  });
  it("should add preview safely", () => {
    const data = `
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  annotations:
    run.googleapis.com/client-name: cloud-console
    run.googleapis.com/ingress: all
    run.googleapis.com/ingress-status: all
  creationTimestamp: '2022-02-28T08:36:32.176035Z'
  generation: 153
  labels:
    cloud.googleapis.com/location: asia-northeast1
  name: helloworld
  namespace: 'xxxxxxxxxx'
  resourceVersion: AAX4CQw8EkQ
  selfLink: /apis/serving.knative.dev/v1/namespaces/xxxxxxxxxx/services/helloworld
  uid: d2023724-21df-8544ff6b7b47
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/maxScale: '1'
      labels:
      name: helloworld-v001-aa3e4b2
    spec:
      containerConcurrency: 80
      containers:
      - args:
        - server
        image: gcr.io/cloudrun/hello:latest
        ports:
        - containerPort: 9085
          name: http1
        resources:
          limits:
            cpu: 1000m
            memory: 128Mi
      serviceAccountName: xxxxxxxxxx-compute@developer.gserviceaccount.com
      timeoutSeconds: 300
  traffic:
  - percent: 100
    revisionName: helloworld-v001-aa3e4b2
status:
  observedGeneration: 154
  conditions:
  - type: Ready
    status: 'True'
    lastTransitionTime: '2023-04-03T06:14:46.897608Z'
  - type: ConfigurationsReady
    status: 'True'
    lastTransitionTime: '2023-03-27T16:12:07.472780Z'
  - type: RoutesReady
    status: 'True'
    lastTransitionTime: '2023-04-03T06:14:47.045895Z'
  latestReadyRevisionName: helloworld-v001-aa3e4b2
  latestCreatedRevisionName: helloworld-v001-aa3e4b2
  traffic:
  - revisionName: helloworld-v001-aa3e4b2
    percent: 100
  - revisionName: helloworld-v001-bbhf45qc
    tag: pr-1
    url: https://pr-1---helloworld-amwk6cvjiq-an.a.run.app
  url: https://helloworld-amwk6cvjiq-an.a.run.app
  address:
    url: helloworld-amwk6cvjiq-an.a.run.app
`;
    const svm = parseServiceManifest(data);
    // add the new tag.
    svm.updatePreviewTraffic("helloworld-v001-bbhf45q", "pr-1");
    expect(svm.object?.spec?.traffic).to.deep.equal([
      {
        percent: 100,
        revisionName: "helloworld-v001-aa3e4b2",
        tag: undefined,
      },
      {
        revisionName: "helloworld-v001-bbhf45q",
        tag: "pr-1",
      },
    ]);

    // replace the old revision's tag with the new revision's.
    svm.updatePreviewTraffic("helloworld-v001-kfdacf3", "pr-1");
    expect(svm.object?.spec?.traffic).to.deep.equal([
      {
        percent: 100,
        revisionName: "helloworld-v001-aa3e4b2",
        tag: undefined,
      },
      {
        revisionName: "helloworld-v001-kfdacf3",
        tag: "pr-1",
      },
    ]);

    expect(svm.getTraffic()).to.deep.equal([
      {
        percent: 100,
        revisionName: "helloworld-v001-aa3e4b2",
      },
      {
        revisionName: "helloworld-v001-bbhf45qc",
        tag: "pr-1",
        url: "https://pr-1---helloworld-amwk6cvjiq-an.a.run.app",
      },
    ]);
  });

  it("should add and update environment variables", () => {
    const data = `
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: helloworld
spec:
  template:
    spec:
      containers:
      - name: app
        image: gcr.io/cloudrun/hello:latest
        env:
        - name: EXISTING_VAR
          value: "old_value"
        - name: APP_ENV
          value: "development"
`;
    const svm = parseServiceManifest(data);

    // Add and update environment variables
    svm.updateEnvVars({
      EXISTING_VAR: "new_value",
      APP_ENV: "production",
      NEW_VAR: "new_value",
    });

    // Validate environment variables after the update
    expect(svm.object?.spec?.template?.spec?.containers[0].env).to.deep.equal([
      { name: "EXISTING_VAR", value: "new_value" }, // Updated
      { name: "APP_ENV", value: "production" }, // Updated
      { name: "NEW_VAR", value: "new_value" }, // Added
    ]);
  });

  it("should initialize env array if not present", () => {
    const data = `
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: helloworld
spec:
  template:
    spec:
      containers:
      - name: app
        image: gcr.io/cloudrun/hello:latest
`;
    const svm = parseServiceManifest(data);

    // Add environment variables
    svm.updateEnvVars({
      APP_ENV: "production",
      NEW_VAR: "new_value",
    });

    // Validate that the env array is initialized and variables are added
    expect(svm.object?.spec?.template?.spec?.containers[0].env).to.deep.equal([
      { name: "APP_ENV", value: "production" }, // Added
      { name: "NEW_VAR", value: "new_value" }, // Added
    ]);
  });

  it("should handle empty environment variables object", () => {
    const data = `
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: helloworld
spec:
  template:
    spec:
      containers:
      - name: app
        image: gcr.io/cloudrun/hello:latest
        env:
        - name: EXISTING_VAR
          value: "old_value"
`;
    const svm = parseServiceManifest(data);

    // Update with an empty env object
    svm.updateEnvVars({});

    // Ensure no changes are made
    expect(svm.object?.spec?.template?.spec?.containers[0].env).to.deep.equal([
      { name: "EXISTING_VAR", value: "old_value" },
    ]);
  });

  it("should preserve existing variables if not in the update", () => {
    const data = `
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: helloworld
spec:
  template:
    spec:
      containers:
      - name: app
        image: gcr.io/cloudrun/hello:latest
        env:
        - name: EXISTING_VAR
          value: "old_value"
        - name: UNCHANGED_VAR
          value: "unchanged_value"
`;
    const svm = parseServiceManifest(data);

    // Add and update environment variables
    svm.updateEnvVars({
      EXISTING_VAR: "new_value",
      NEW_VAR: "new_value",
    });

    // Ensure existing variables are updated and new ones are added,
    // while others remain unchanged
    expect(svm.object?.spec?.template?.spec?.containers[0].env).to.deep.equal([
      { name: "EXISTING_VAR", value: "new_value" }, // Updated
      { name: "UNCHANGED_VAR", value: "unchanged_value" }, // Unchanged
      { name: "NEW_VAR", value: "new_value" }, // Added
    ]);
  });
});
