import React, { useState, useEffect, useRef } from "react";
import { Camera, CameraType } from "expo-camera";
import { StatusBar } from "expo-status-bar";
import {
  Button,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  TextInput,
  LogBox,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { RNS3 } from "react-native-aws3";
import * as Speech from "expo-speech";
import axios from "axios";
import { Amplify, Storage } from "aws-amplify";
import awsconfig from "./src/aws-exports";
Amplify.configure(awsconfig);

// Amplify.configure({
//   Auth: {
//       identityPoolId: 'XX-XXXX-X:XXXXXXXX-XXXX-1234-abcd-1234567890ab', //REQUIRED - Amazon Cognito Identity Pool ID
//       region: 'XX-XXXX-X', // REQUIRED - Amazon Cognito Region
//       userPoolId: 'XX-XXXX-X_abcd1234', //OPTIONAL - Amazon Cognito User Pool ID
//       userPoolWebClientId: 'XX-XXXX-X_abcd1234', //OPTIONAL - Amazon Cognito Web Client ID
//   },
//   Storage: {
//       AWSS3: {
//           bucket: '', //REQUIRED -  Amazon S3 bucket name
//           region: 'XX-XXXX-X', //OPTIONAL -  Amazon service region
//       }
//   }
// });

LogBox.ignoreLogs(["Remote debugger"]);

const BE_URL = "https://us3hqnevlc.execute-api.ap-south-1.amazonaws.com/test";

const region = "ap-south-1";
const TABLE_NAME = "testPython";

const SCREENS = {
  CLICK: "click",
  UPLOAD: "upload",
};

const Bucket = "testpythong";

const options = {
  keyPrefix: "",
  bucket: Bucket,
  region,
  accessKey: "AKIA6LCHQKL3EFMUGA77",
  secretKey: "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",
  successActionStatus: 201,
  type: "image/jpg",
};

export default function App() {
  const ref = useRef(null);

  const [screen, setScreen] = useState(SCREENS.CLICK);

  const [permission, requestPermission] = Camera.useCameraPermissions();
  const [clickedPhoto, setClickedPhoto] = useState(null);
  const [name, setName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [addingToCollection, setAddingToCollection] = useState(false);
  const [saving, setSaving] = useState(false);
  const [added, setAdded] = useState(false);
  const [matching, setMatching] = useState(false);
  const [gettingName, setGettingName] = useState(false);
  const [nameFound, setNameFound] = useState(false);

  const [camera, setCamera] = useState({
    hasCameraPermission: null,
    type: Camera.Constants.Type.back,
  });

  const speak = (speakText) => Speech.speak(speakText);

  const initFunc = async () => {
    const { status } = await requestPermission();

    setCamera((prevState) => ({
      ...prevState,
      hasCameraPermission: status === "granted",
    }));
  };

  useEffect(() => {
    initFunc();
  }, []);

  const _takePhoto = async (navigateToUpload, handleClickSubmitFunc) => {
    const photo = await ref.current.takePictureAsync({ base64: false });
    // console.log(photo);
    // response - {"height": 1600, "uri": "file:///data/user/0/host.exp.exponent/cache/ExperienceData/%2540bsbhandar%252Fghajni-fe/Camera/67bb0f97-73b2-439d-81d6-47db1a123e04.jpg", "width": 1200}
    setClickedPhoto(photo);
    if (navigateToUpload) setScreen(SCREENS.UPLOAD);
    if (handleClickSubmitFunc) handleClickSubmit(photo);
  };

  function toggleCameraType() {
    setCamera({
      type:
        camera.type === Camera.Constants.Type.back
          ? Camera.Constants.Type.front
          : Camera.Constants.Type.back,
    });
  }

  const uploadToS3 = async (photo) => {
    const response = await fetch(photo.uri);

    const blob = await response.blob();

    const res = await Storage.put(blob._data.name, blob, {
      contentType: "image/jpg", // contentType is optional
    });

    return res;
  };

  const handleClickSubmit = async (photo) => {
    try {
      setNameFound(null);
      setUploading(true);
      const res = await uploadToS3(photo);
      setUploading(false);

      setMatching(true);
      const res2 = await axios.post(
        BE_URL + "?resource=searchFace&object_key=" + res.key,
        {}
      );
      setMatching(false);

      if (
        res2.data.body?.FaceMatches &&
        res2.data.body.FaceMatches.length > 0
      ) {
        setGettingName(true);
        const res3 = await axios.post(
          BE_URL +
            "?resource=getItemDynamo&face_id=" +
            res2.data.body?.FaceMatches[0].Face.FaceId,
          {}
        );
        setGettingName(false);

        if (res3.data?.body?.Item?.name) {
          setNameFound(res3.data.body.Item.name.S);
          speak(res3.data.body.Item.name.S);
        }
      }
      setClickedPhoto(null);
    } catch (error) {
      console.error(error);
    }
  };

  const handleUploadSubmit = async (photo) => {
    try {
      setNameFound(null);
      setUploading(true);
      const res = await uploadToS3(photo);
      setUploading(false);

      setAddingToCollection(true);
      const res2 = await axios.post(
        BE_URL + "?resource=addToCollection&object_key=" + res.key,
        {}
      );
      setAddingToCollection(false);

      setSaving(true);
      const res3 = await axios.post(
        BE_URL +
          "?resource=putItemDynamo&face_id=" +
          res2.data.body.FaceRecords[0].Face.FaceId,
        {
          name,
        }
      );
      setSaving(false);

      setAdded(true);
      setAdded(false);
      setScreen(SCREENS.CLICK);
      setName("");
      setClickedPhoto(null);
    } catch (error) {
      console.error(error);
    }
  };

  if (screen === SCREENS.UPLOAD)
    return (
      <View style={styles.fullCont}>
        {/* <View style={styles.header}>
          <TouchableOpacity activeOpacity={0.6} onPress={() => setScreen(null)}>
            <Ionicons name="arrow-back" size={32} color="gray" />
          </TouchableOpacity>
          <Text style={styles.headerTxt}>Upload</Text>
        </View> */}

        <View style={{ flex: 1 }}>
          {uploading && (
            <Text style={styles.loaderText}>Uploading Image...</Text>
          )}
          {addingToCollection && (
            <Text style={styles.loaderText}>Adding Image to Collection...</Text>
          )}
          {saving && <Text style={styles.loaderText}>Saving data...</Text>}
          {added && <Text style={styles.loaderText}>Added</Text>}

          <Text style={styles.inputLabel}>Image</Text>
          <Image
            source={{ uri: clickedPhoto?.uri }}
            style={{ width: 200, height: 200 }}
          />
          <Text style={styles.inputLabel}>Name</Text>
          <TextInput
            value={name}
            onChangeText={(name) => setName(name)}
            placeholder={"Name"}
            style={styles.input}
          />
          <View style={{ marginVertical: 10 }}>
            <Button
              title="Submit"
              disabled={!(name && name.length > 3)}
              onPress={() => handleUploadSubmit(clickedPhoto)}
            />
          </View>

          <View style={[styles.btn, { alignSelf: "center" }]}>
            <Button
              title="Reset"
              color="gray"
              onPress={() => {
                setScreen(SCREENS.CLICK);
                setClickedPhoto(null);
                setName("");
                setNameFound("");
              }}
            />
          </View>
        </View>

        <StatusBar style="auto" />
      </View>
    );
  else if (screen === SCREENS.CLICK)
    return (
      <View style={styles.fullCont}>
        {/* <View style={styles.header}>
          <TouchableOpacity activeOpacity={0.6} onPress={() => setScreen(null)}>
            <Ionicons name="arrow-back" size={32} color="gray" />
          </TouchableOpacity>
          <Text style={styles.headerTxt}>Click</Text>
        </View> */}

        <View style={{ flex: 1 }}>
          {uploading && (
            <Text style={styles.loaderText}>Uploading Image...</Text>
          )}
          {matching && (
            <Text style={styles.loaderText}>
              Matching the Image from the Images in the Collection...
            </Text>
          )}
          {gettingName && (
            <Text style={styles.loaderText}>Getting name...</Text>
          )}
          {nameFound && <Text style={styles.loaderText}>{nameFound}</Text>}

          <Camera
            style={{ flex: 1 }}
            type={camera.type}
            autoFocus={true}
            ref={ref}
          >
            <View
              style={{
                flex: 1,
                backgroundColor: "transparent",
                flexDirection: "row",
              }}
            >
              <TouchableOpacity
                style={{
                  flex: 0.1,
                  alignSelf: "flex-end",
                  alignItems: "center",
                }}
                onPress={toggleCameraType}
              >
                <Text
                  style={{ fontSize: 18, marginBottom: 10, color: "white" }}
                >
                  {" "}
                  Flip{" "}
                </Text>
              </TouchableOpacity>
            </View>
          </Camera>

          <View style={{ marginVertical: 10 }}>
            <Button title="Click" onPress={() => _takePhoto(false, true)} />
          </View>
          <View style={{ marginBottom: 10 }}>
            <Button title="Upload" onPress={() => _takePhoto(true)} />
          </View>
        </View>

        <StatusBar style="auto" />
      </View>
    );

  return (
    <View style={styles.container}>
      <View style={styles.btn}>
        <Button
          title="Click"
          onPress={() => {
            setScreen(SCREENS.CLICK);
            setClickedPhoto(null);
            setNameFound("");
          }}
        />
      </View>
      <View style={styles.btn}>
        <Button
          title="Upload"
          onPress={() => {
            setScreen(SCREENS.UPLOAD);
            setClickedPhoto(null);
            setNameFound("");
          }}
        />
      </View>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  btn: {
    width: 150,
    margin: 10,
    padding: 10,
  },
  fullCont: {
    paddingVertical: 40,
    paddingHorizontal: 10,
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTxt: {
    color: "gray",
    fontWeight: "600",
    marginLeft: 10,
    fontSize: 20,
  },
  inputLabel: {
    marginVertical: 10,
    fontWeight: "400",
    fontSize: 18,
    color: "gray",
  },
  input: {
    width: 250,
    height: 44,
    padding: 10,
    borderWidth: 1,
    borderColor: "#e8e8e8",
    borderRadius: 5,
    // marginTop: 20,
    // marginBottom: 10,
    // backgroundColor: '#e8e8e8'
  },
  loaderText: {
    textAlign: "center",
    color: "green",
    fontWeight: "600",
    marginVertical: 6,
    fontSize: 16,
  },
});
