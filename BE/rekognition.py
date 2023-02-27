import boto3


def create_collection(collection_id):

    client = boto3.client('rekognition')

    # Create a collection
    print('Creating collection:' + collection_id)
    response = client.create_collection(CollectionId=collection_id)
    print('Collection ARN: ' + response['CollectionArn'])
    print('Status code: ' + str(response['StatusCode']))
    print('Done...')


def add_faces_to_collection(bucket, photo, collection_id):

    client = boto3.client('rekognition')

    response = client.index_faces(CollectionId=collection_id, Image={'S3Object': {
                                  'Bucket': bucket, 'Name': photo}}, ExternalImageId=photo, MaxFaces=1, QualityFilter="AUTO", DetectionAttributes=['ALL'])

    print('Results for ' + photo)
    print('Faces indexed:')
    for faceRecord in response['FaceRecords']:
        print('  Face ID: ' + faceRecord['Face']['FaceId'])
        print('  Location: {}'.format(faceRecord['Face']['BoundingBox']))

    print('Faces not indexed:')
    for unindexedFace in response['UnindexedFaces']:
        print(' Location: {}'.format(
            unindexedFace['FaceDetail']['BoundingBox']))
        print(' Reasons:')
        for reason in unindexedFace['Reasons']:
            print('   ' + reason)
    return len(response['FaceRecords'])


def upload_to_s3(local_file, bucket, s3_file):
    s3 = boto3.client('s3')

    try:
        s3.upload_file(local_file, bucket, s3_file)
        print("Upload Successful")
        return True
    except FileNotFoundError:
        print("The file was not found")
        return False
    except NoCredentialsError:
        print("Credentials not available")
        return False


if __name__ == "__main__":
    # bucket = 'testpythong'
    # collection_id = 'Collection'
    # fileName = '3.jpeg'
    # threshold = 70
    # maxFaces = 1
    # # photos = ['1.jpeg', '2.jpeg']

    # client = boto3.client('rekognition')

    # response = client.search_faces_by_image(CollectionId=collection_id, Image={'S3Object': {
    #                                         'Bucket': bucket, 'Name': fileName}}, FaceMatchThreshold=threshold, MaxFaces=maxFaces)

    # print(response)

    event = {}

    something = event['some'] or 70

    print(something)
