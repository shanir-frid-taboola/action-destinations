// Generated file. DO NOT MODIFY IT BY HAND.

export interface Payload {
  /**
   * IAM user credentials with write permissions to the S3 bucket.
   */
  s3_aws_access_key?: string
  /**
   * IAM user credentials with write permissions to the S3 bucket.
   */
  s3_aws_secret_key?: string
  /**
   * Name of the S3 bucket where the files will be uploaded to.
   */
  s3_aws_bucket_name?: string
  /**
   * Region where the S3 bucket is hosted.
   */
  s3_aws_region: string
  /**
   * Unique ID that identifies members of an audience. A typical audience key might be client customer IDs, email addresses, or phone numbers. See more information on [LiveRamp Audience Key](https://docs.liveramp.com/connect/en/onboarding-terms-and-concepts.html#audience-key)
   */
  audience_key: string
  /**
   * Additional data pertaining to the user to be written to the file.
   */
  identifier_data?: {
    [k: string]: unknown
  }
  /**
   * Additional data pertaining to the user to be hashed before written to the file. Use field name **phone_number** or **email** to apply LiveRamp's specific hashing rules.
   */
  unhashed_identifier_data?: {
    [k: string]: unknown
  }
  /**
   * Character used to separate tokens in the resulting file.
   */
  delimiter: string
  /**
   * Name of the CSV file to upload for LiveRamp ingestion. For multiple subscriptions, make sure to use a unique filename for each subscription.
   */
  filename: string
  /**
   * Receive events in a batch payload. This is required for LiveRamp audiences ingestion.
   */
  enable_batching: boolean
  /**
   * Maximum number of events to include in each batch. Actual batch sizes may be lower.
   */
  batch_size?: number
  /**
   * Optional path within the S3 bucket where the files will be uploaded to. If not provided, files will be uploaded to the root of the bucket. Example: "folder1/folder2"
   */
  s3_aws_bucket_path?: string
}
